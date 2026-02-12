import { useState } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

const ExternalLink = ({ href, children }) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
      >
        {children}
        <ExternalLinkIcon className="inline h-3 w-3" />
      </a>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open External Link?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave this website and open:
              <br />
              <span className="text-blue-400 break-all mt-2 block">{href}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Open Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExternalLink;
