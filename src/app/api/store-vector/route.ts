import createClient from "@/lib/supabase/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";

// const chatModel = new ChatOpenAI({
//   openAIApiKey: process.env.NEXT_PUBLIC_NEXT_PUBLIC_OPENAI_API_KEY,
// });
// const outputParser = new StringOutputParser();

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  try {
    const { session_id, file_url } = await req.json();
    const response = await fetch(file_url);
    const blob = await response.blob();

    // Request the OpenAI API for the response based on the prompt
    const loader = new PDFLoader(blob, {
      splitPages: false,
    });

    const docs = await loader.load();
    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docsWithMetadata = docs.map((doc) => {
      return { ...doc, metadata: { ...doc.metadata, session_id: session_id } };
    });

    const splitDocs = await textSplitter.splitDocuments(docsWithMetadata);
    console.log({ splitDocs });

    const supabase = await createClient();
    await SupabaseVectorStore.fromDocuments(
      splitDocs,
      new OpenAIEmbeddings({
        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      }),
      {
        client: supabase,
        tableName: "documents",
      },
    );

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(String(error), {
      status: 200,
    });
  }
  // return new StreamingTextResponse(stream);
}
