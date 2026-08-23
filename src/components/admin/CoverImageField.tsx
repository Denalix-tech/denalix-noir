"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";

import { uploadCoverImageAction } from "@/lib/blog/upload-actions";
import { MAX_IMAGE_BYTES } from "@/lib/blog/image-type";

const MAX_MB = Math.floor(MAX_IMAGE_BYTES / 1024 / 1024);

type Props = {
  url: string;
  alt: string;
  onUrlChange: (url: string) => void;
  onAltChange: (alt: string) => void;
  altError?: string;
};

/**
 * Cover image picker.
 *
 * The upload calls the Server Action directly rather than through a nested
 * <form>, which would be invalid HTML inside the editor's own form.
 */
export function CoverImageField({ url, alt, onUrlChange, onAltChange, altError }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image to upload.");
      return;
    }

    // Checked here as well as in the action. Next rejects an oversized Server
    // Action body before the action runs, so without this the user would get a
    // thrown request rather than a sentence naming the size.
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setError(
        `That image is ${mb} MB. Covers must be ${MAX_MB} MB or smaller — export it at a lower quality, or resize it to around 1200x630 first.`,
      );
      return;
    }

    const payload = new FormData();
    payload.set("file", file);

    startTransition(async () => {
      try {
        const result = await uploadCoverImageAction({}, payload);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.url) {
          setError(null);
          onUrlChange(result.url);
          if (inputRef.current) inputRef.current.value = "";
        }
      } catch {
        // A rejected action used to surface as an unhandled rejection, which
        // left the field showing "Uploading…" and then nothing at all.
        setError("The upload did not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-white">Cover image</legend>

      {url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm border border-white/10">
          <Image
            src={url}
            alt={alt || "Cover image preview"}
            fill
            sizes="480px"
            className="object-cover"
          />
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted-soft">
          No cover image selected
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Choose a cover image (JPEG, PNG, or WebP, up to ${MAX_MB} MB)`}
          className="max-w-full text-sm text-muted file:mr-3 file:rounded-sm file:border file:border-white/15 file:bg-white/5 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={pending}
          className="rounded-sm border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>

        {url ? (
          <button
            type="button"
            onClick={() => {
              onUrlChange("");
              onAltChange("");
              setError(null);
            }}
            className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
          >
            Remove
          </button>
        ) : null}
      </div>

      <p className="text-xs text-muted-soft">
        JPEG, PNG, or WebP. Maximum {MAX_MB} MB. Resized to 1200x630 automatically.
      </p>

      <p aria-live="polite" className="sr-only">
        {pending ? "Uploading image" : ""}
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="coverImageAlt" className="block text-sm font-medium text-white">
          Cover image alt text{url ? " (required)" : ""}
        </label>
        <input
          id="coverImageAlt"
          name="coverImageAlt"
          value={alt}
          onChange={(event) => onAltChange(event.target.value)}
          required={Boolean(url)}
          aria-invalid={altError ? true : undefined}
          aria-describedby={altError ? "coverImageAlt-error" : "coverImageAlt-hint"}
          className="mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/50"
        />
        <p id="coverImageAlt-hint" className="mt-2 text-xs text-muted-soft">
          Describe the image for readers using a screen reader. Required when a cover image is set.
        </p>
        {altError ? (
          <p id="coverImageAlt-error" className="mt-2 text-sm text-red-300">
            {altError}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="coverImageUrl" value={url} />
    </fieldset>
  );
}
