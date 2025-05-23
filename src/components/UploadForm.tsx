
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { uploadNote } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { FileUp, FileText, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length === 1, "Please select a file")
    .transform((files) => files[0])
    .refine((file) => file.size <= MAX_FILE_SIZE, "File size must be less than 200MB"),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

// Create a type for the raw form values (before transformations)
type RawUploadFormValues = {
  title: string;
  file: FileList;
};

interface UploadFormProps {
  onSuccess?: () => void;
}

export const UploadForm = ({ onSuccess }: UploadFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('Calculating...');
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string>('Calculating...');
  
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
    },
  });
  
  const onSubmit = async (data: UploadFormValues) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadedBytes(0);
      setUploadSpeed('Calculating...');
      setEstimatedTimeLeft('Calculating...');
      
      const fileToUpload: File = data.file;
      const startTime = Date.now();
      const fileSize = fileToUpload.size;
      let lastLoaded = 0;
      let lastTime = startTime;
      let speedHistory: number[] = [];
      
      const trackProgress = (loaded: number, total: number) => {
        const progress = Math.round((loaded / total) * 100);
        console.log(`Upload progress: ${progress}%, ${formatFileSize(loaded)}/${formatFileSize(total)}`);
        
        setUploadProgress(progress);
        setUploadedBytes(loaded);
        
        const currentTime = Date.now();
        const timeElapsed = (currentTime - lastTime) / 1000; // in seconds
        
        if (timeElapsed > 0) {
          const bytesDiff = loaded - lastLoaded;
          const currentSpeed = bytesDiff / timeElapsed;
          
          if (currentSpeed > 0) {
            speedHistory.push(currentSpeed);
            if (speedHistory.length > 5) {
              speedHistory.shift();
            }
          }
          
          const avgSpeed = speedHistory.length > 0 
            ? speedHistory.reduce((sum, speed) => sum + speed, 0) / speedHistory.length 
            : currentSpeed;
          
          setUploadSpeed(formatSpeed(avgSpeed));
          
          if (avgSpeed > 0) {
            const bytesRemaining = total - loaded;
            const timeRemaining = bytesRemaining / avgSpeed;
            setEstimatedTimeLeft(formatTime(timeRemaining));
          }
          
          lastLoaded = loaded;
          lastTime = currentTime;
        }
      };
      
      await uploadNote(
        data.title,
        "", // Empty description
        fileToUpload,
        null, // No user ID needed anymore
        trackProgress // Pass the progress tracker
      );
      
      toast({
        title: "Note uploaded",
        description: "Your note has been uploaded successfully",
      });
      
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadedBytes(0);
      setUploadSpeed('');
      setEstimatedTimeLeft('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error uploading note:", error);
      toast({
        title: "Error uploading note",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      // Fix: Use type assertion to inform TypeScript about the expected type
      form.setValue("file", files as unknown as any, { shouldValidate: true });
    } else {
      setSelectedFile(null);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond > 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
    } else if (bytesPerSecond > 1024) {
      return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
    } else {
      return `${Math.round(bytesPerSecond)} B/s`;
    }
  };
  
  const formatTime = (seconds: number): string => {
    if (seconds < 1) {
      return 'Less than a second';
    } else if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${minutes.toString().padStart(2, '0')} hours`;
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter note title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => {
                        handleFileChange(e);
                      }}
                      {...rest}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex items-center justify-center w-full gap-2 border-2 border-dashed border-gray-300 rounded-md py-3 px-4 hover:bg-gray-50 transition-colors"
                    >
                      <FileUp className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-500">
                        {selectedFile ? "Change file" : "Select a file"}
                      </span>
                    </label>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedFile && (
          <Card className="bg-gray-50 mt-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Uploading...</span>
              <span>
                {uploadProgress}% • {selectedFile && uploadedBytes > 0 ? 
                  `${formatFileSize(uploadedBytes)}/${formatFileSize(selectedFile.size)}` : 
                  'Starting...'}
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            {uploadSpeed && (
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Speed: {uploadSpeed}</span>
                <span>Estimated time: {estimatedTimeLeft}</span>
              </div>
            )}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Upload Note
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
