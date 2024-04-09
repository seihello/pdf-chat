import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
import { useEffect, useState } from "react";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CharacterTextSplitter, RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NextResponse } from "next/server";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import createClient from "@/lib/supabase/server";

// const chatModel = new ChatOpenAI({
//   openAIApiKey: process.env.NEXT_PUBLIC_NEXT_PUBLIC_OPENAI_API_KEY,
// });
// const outputParser = new StringOutputParser();

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  // const { messages } = await req.json();

  // Request the OpenAI API for the response based on the prompt
  const loader = new PDFLoader("public/Seisuke_Yamada_Resume.pdf", {
    splitPages: false,
  });

  const docs = await loader.load();
  const textSplitter = new CharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separator: "\n ",
  });

  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log({ splitDocs });

  const supabase = await createClient();
  await SupabaseVectorStore.fromDocuments(
    splitDocs,
    new OpenAIEmbeddings({ openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY }),
    {
      client: supabase,
      tableName: "documents",
    }
  );

  return new Response(null, {
    status: 200,
  });
  // return new StreamingTextResponse(stream);
}
