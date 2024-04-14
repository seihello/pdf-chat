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
  console.log("store-vector");

  try {
    const { session_id, file_url } = await req.json();
    console.log("aaa");

    const response = await fetch(file_url);
    console.log("bbb");

    const blob = await response.blob();
    console.log("ccc");

    // Request the OpenAI API for the response based on the prompt
    const loader = new PDFLoader(blob, {
      splitPages: false,
    });

    console.log("ddd");

    const docs = await loader.load();
    console.log("eee");

    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    console.log("fff");

    const docsWithMetadata = docs.map((doc) => {
      return { ...doc, metadata: { ...doc.metadata, session_id: session_id } };
    });

    console.log("ggg");

    const splitDocs = await textSplitter.splitDocuments(docsWithMetadata);
    console.log({ splitDocs });
    console.log("hhh");

    const supabase = await createClient();
    console.log("iii");

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
    console.log("jjj");

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
