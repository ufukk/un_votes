<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { get } from 'svelte/store';
    
    // Define type for resolution details
    type Resolution = {
      symbol: string;
      title: string;
      date: Date;
      detailsUrl: string;
      content: string;
    };
  
    let resolution: Resolution | null = null;
    let isLoading = true;
    let errorMessage: string | null = null;
  
    // Fetch resolution details based on ID
    async function fetchResolution(id: string) {
      isLoading = true;
      errorMessage = null;
      try {
        const response = await fetch(`/api/resolutions/details?symbol=${id}`);
        if (!response.ok) throw new Error('Failed to fetch resolution details');
  
        resolution = await response.json();
      } catch (error) {
        console.error('Error fetching resolution details:', error);
        errorMessage = 'Failed to fetch resolution details. Please try again later.';
      } finally {
        isLoading = false;
      }
    }
  
    // Get the resolution ID from the URL
    const params = new URLSearchParams();
    const id = params.get('id')   

  
    // Fetch resolution details on component mount
    onMount(() => {
      fetchResolution(id);
    });
  </script>
  
  <style>
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }
  
    .loading,
    .error {
      text-align: center;
      margin: 2rem 0;
    }
  
    .resolution-details {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      background-color: #f9f9f9;
    }
  
    .resolution-details h1 {
      margin-top: 0;
    }
  
    .resolution-details p {
      margin: 0.5rem 0;
    }
  
    .resolution-details a {
      color: #0070f3;
      text-decoration: none;
    }
  
    .resolution-details a:hover {
      text-decoration: underline;
    }
  
    .resolution-content {
      margin-top: 1rem;
    }
  </style>
  
  <div class="container">
    {#if isLoading}
      <p class="loading">Loading...</p>
    {/if}
  
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
  
    {#if resolution}
      <div class="resolution-details">
        <h1>{resolution.title}</h1>
        <p><strong>Symbol:</strong> {resolution.symbol}</p>
        <p><strong>Date:</strong> {new Date(resolution.date).toLocaleDateString()}</p>
        <p><strong>Details:</strong> <a href={resolution.detailsUrl} target="_blank">View Details</a></p>
        <div class="resolution-content">
          <h2>Content</h2>
          <p>{resolution.content}</p>
        </div>
      </div>
    {/if}
  </div>