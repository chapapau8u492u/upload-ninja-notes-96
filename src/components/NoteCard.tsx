
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Star } from "lucide-react";
import { NoteWithDetails } from "@/types";
import { RatingStars } from "./RatingStars";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface NoteCardProps {
  note: NoteWithDetails;
  onDelete?: () => void;
  showRatingInteraction?: boolean;
}

export const NoteCard = ({ note, onDelete, showRatingInteraction = false }: NoteCardProps) => {
  const [ratingUpdated, setRatingUpdated] = useState(false);
  
  const fileUrl = note.file_url;
  
  const handleDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = note.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error downloading file",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleRatingChange = () => {
    setRatingUpdated(true);
    if (onDelete) {
      // Use onDelete as a general refresh callback
      onDelete();
    }
  };
  
  // Format uploaded date
  let uploadedDate;
  try {
    uploadedDate = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
  } catch (error) {
    uploadedDate = "Unknown date";
  }
  
  // Format rating badge color based on rating
  const getRatingColor = (rating: number | null) => {
    if (rating === null) return "bg-gray-200 text-gray-700";
    if (rating >= 4) return "bg-green-100 text-green-800";
    if (rating >= 3) return "bg-blue-100 text-blue-800";
    if (rating >= 2) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };
  
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold line-clamp-1">{note.title}</CardTitle>
          {note.average_rating !== null && (
            <Badge variant="outline" className={`flex items-center gap-1 ${getRatingColor(note.average_rating)}`}>
              <Star className="h-3 w-3 fill-current" />
              <span>{note.average_rating.toFixed(1)}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {note.description && (
          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{note.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{note.file_name}</span>
          </div>
          <div>
            {note.file_size}
          </div>
          <div>
            {uploadedDate}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <RatingStars 
          noteId={note.id}
          averageRating={note.average_rating}
          ratingsCount={note.ratings_count}
          interactive={true}
          onRatingChange={handleRatingChange}
        />
        <Button 
          onClick={handleDownload} 
          variant="default" 
          size="sm"
          className="gap-1 ml-auto"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};
