/**
 * Documents Page (with collection name in URL)
 * 
 * This page handles the route /projects/[projectId]/collections/[collectionName]/documents
 * It redirects to the main documents page with the collection pre-selected
 * 
 * @module app/(sidebar)/projects/[projectId]/collections/[collectionName]/documents/page
 */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CollectionDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  
  const projectId = params?.projectId ? String(params.projectId) : "";
  const collectionName = params?.collectionName ? String(params.collectionName) : "";

  useEffect(() => {
    if (projectId && collectionName) {
      // Redirect to the main documents page with collection name as query param
      // The documents page will read this and select the collection
      router.replace(`/projects/${projectId}/documents?collection=${encodeURIComponent(collectionName)}`);
    }
  }, [projectId, collectionName, router]);

  return null; // This page just redirects, so no UI needed
}

