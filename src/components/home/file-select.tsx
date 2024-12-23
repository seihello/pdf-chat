import { Button } from "@/components/ui/button";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaCloudArrowUp, FaRegFilePdf, FaRegTrashCan } from "react-icons/fa6";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
  acceptedFileCount: number;
  errorMessage: string;
}

export default function FileSelect({
  files,
  setFiles,
  acceptedFileCount,
  errorMessage,
}: Props) {
  const [isFileSelectedOnce, setIsFileSelectedOnce] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length >= 1) {
        setFiles([...files, ...acceptedFiles]);
        setIsFileSelectedOnce(true);
      }
    },
    [files, setFiles],
  );

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 30 * 1024 * 1024,
  });

  if (acceptedFileCount === 0) return;

  return (
    <div
      {...getRootProps()}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-y-4 rounded border-[3px] border-dotted bg-gray-50 p-44 px-4 py-6 font-normal text-gray-500 hover:bg-gray-100"
    >
      {errorMessage && (
        <p className="text-center text-destructive">{errorMessage}</p>
      )}
      <FaCloudArrowUp size={64} />
      <input {...getInputProps()} />
      <div className="w-full text-center">
        Drag and drop <span className="font-bold">{acceptedFileCount} </span>{" "}
        PDF file
        {acceptedFileCount === 1 ? "" : "s"} here, or click to select
        {acceptedFileCount === 1 ? " a file" : " files"}.
      </div>
      <div className="flex flex-col items-center">
        <p>
          *Maximum file size is <b>30MB</b>.
        </p>
        <p>
          *We only accept files written in <b>English</b>.
        </p>
      </div>
      {isFileSelectedOnce && files.length !== acceptedFileCount && (
        <div className="text-destructive">{`Please select ${acceptedFileCount} ${acceptedFileCount === 1 ? "file" : "files or less"}.`}</div>
      )}
      {files.length > 0 && (
        <div className="flex w-full flex-col items-center gap-y-2">
          {files.map((file: File, index: number) => (
            <div
              key={index}
              className="flex w-full max-w-[480px] items-center justify-between gap-x-2 rounded-sm bg-white px-4 py-2"
            >
              <FaRegFilePdf size={20} className="text-destructive" />
              <div className="flex flex-1 shrink items-center gap-x-2 overflow-hidden text-ellipsis whitespace-nowrap text-gray-700">
                {file.name}
              </div>
              <Button
                variant="ghost"
                className="!min-w-0 p-0 hover:bg-none"
                onClick={(e) => {
                  e.stopPropagation();
                  const newFiles = [...files];
                  newFiles.splice(index, 1);
                  setFiles(newFiles);
                }}
              >
                <FaRegTrashCan size={20} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-center gap-x-2 bg-yellow-50 p-2 text-center">
        <IconAlertTriangle className="-mt-[3px] text-yellow-500" />
        <div className="flex flex-col items-center text-sm text-yellow-900">
          <span>
            Uploaded files will not be viewed by others or used for any purpose
            other than conversations with AI.
          </span>
          <span>
            However, if you are concerned, please avoid uploading files that
            contain personal information.
          </span>
        </div>
      </div>
    </div>
  );
}
