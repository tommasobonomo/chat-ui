import { env } from "$env/dynamic/private";
import { generateFromDefaultEndpoint } from "$lib/server/generateFromDefaultEndpoint";
import type { EndpointMessage } from "../endpoints/endpoints";
import { logger } from "$lib/server/logger";
import { MessageUpdateType, type MessageUpdate } from "$lib/types/MessageUpdate";
import type { Conversation } from "$lib/types/Conversation";

export async function* generateTitleForConversation(
	conv: Conversation
): AsyncGenerator<MessageUpdate, undefined, undefined> {
	try {
		const userMessage = conv.messages.find((m) => m.from === "user");
		// HACK: detect if the conversation is new
		if (conv.title !== "New Chat" || !userMessage) return;

		const prompt = userMessage.content;
		const title = (await generateTitle(prompt)) ?? "New Chat";

		yield {
			type: MessageUpdateType.Title,
			title,
		};
	} catch (cause) {
		console.error(Error("Failed whilte generating title for conversation", { cause }));
	}
}

export async function generateTitle(prompt: string) {
	if (env.LLM_SUMMARIZATION !== "true") {
		return prompt.split(/\s+/g).slice(0, 5).join(" ");
	}

	const messages: Array<EndpointMessage> = [
		{
			from: "system",
			content:
				"Sei un'intelligenza artificiale. Non risponderai mai a una domanda dell'utente direttamente, ma invece riassumerai la richiesta dell'utente in una singola frase da massimo quattro parole. Comincia sempre la tua risposta con un emoji rilevante al riassunto.",
		},
		{ from: "user", content: "Chi è il presidente del Gabon?" },
		{ from: "assistant", content: "🇬🇦 Presidente del Gabon" },
		{ from: "user", content: "Chi è Julien Chaumond?" },
		{ from: "assistant", content: "🧑 Julien Chaumond" },
		{ from: "user", content: "Cosa fa 1 + 1?" },
		{ from: "assistant", content: "🔢 Semplice operazione matematica" },
		{ from: "user", content: "Quali sono le notizie più recenti?" },
		{ from: "assistant", content: "📰 Ultim'ora" },
		{ from: "user", content: "Come posso fare una buona cheesecake?" },
		{ from: "assistant", content: "🍰 Ricetta cheesecake" },
		{ from: "user", content: "Qual è il tuo film preferito? Rispondi brevenemte." },
		{ from: "assistant", content: "🎥 Film preferito" },
		{ from: "user", content: "Spiega il concetto di intelligenza artificiale in una frase" },
		{ from: "assistant", content: "🤖 Definizione IA" },
		{ from: "user", content: "Disegna un gatto carino" },
		{ from: "assistant", content: "🐱 Disegno gatto carino" },
		{ from: "user", content: prompt },
	];

	return await generateFromDefaultEndpoint({
		messages,
		preprompt:
			"Sei un'intelligenza artificiale. Non risponderai mai a una domanda dell'utente direttamente, ma invece riassumerai la richiesta dell'utente in una singola frase da massimo quattro parole. Comincia sempre la tua risposta con un emoji rilevante al riassunto.",
		generateSettings: {
			max_new_tokens: 15,
		},
	})
		.then((summary) => {
			// add an emoji if none is found in the first three characters
			if (!/\p{Emoji}/u.test(summary.slice(0, 3))) {
				return "💬 " + summary;
			}
			return summary;
		})
		.catch((e) => {
			logger.error(e);
			return null;
		});
}
