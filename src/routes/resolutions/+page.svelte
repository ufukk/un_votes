<script lang="ts">
  import { onMount } from 'svelte';

  // Define types for resolutions and filters
  type Resolution = {
    symbol: string;
    title: string;
    date: Date;
    detailsUrl: string;
  };

  type Agenda = {
    agenda_id: number;
    name: string;
  };

  // State for resolutions, agendas, filters, and pagination
  let resolutions: Resolution[] = [];
  let agendas: Agenda[] = [];
  let selectedYear: number | null = null;
  let selectedAgenda: number | null = null;
  let years: number[] = [];
  let isLoading = false;
  let currentPage = 1;
  let totalPages = 1;
  const itemsPerPage = 10; // Number of items per page
  const maxVisiblePages = 5; // Maximum number of visible page buttons

  // Fetch resolutions based on filters and pagination
  async function fetchResolutions() {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set('year', selectedYear.toString());
      if (selectedAgenda) params.set('agenda', selectedAgenda.toString());
      params.set('page', currentPage.toString());
      params.set('limit', itemsPerPage.toString());

      const response = await fetch(`/api/resolutions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch resolutions');

      const data = await response.json();
      resolutions = data.resolutions;
      totalPages = data.totalPages;
    } catch (error) {
      console.error('Error fetching resolutions:', error);
    } finally {
      isLoading = false;
    }
  }

  // Handle page change
  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchResolutions();
  }

  // Generate visible page numbers with ellipses
  function getVisiblePages() {
    const pages = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, currentPage + halfVisible);

    if (currentPage - halfVisible > 1) {
      pages.push(1);
      if (currentPage - halfVisible > 2) {
        pages.push('...');
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage + halfVisible < totalPages) {
      if (currentPage + halfVisible < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  }

  // Fetch available years and agendas on component mount
  onMount(async () => {
    try {
      const [yearsResponse, agendasResponse] = await Promise.all([
        fetch('/api/resolutions/years'),
        fetch('/api/resolutions/agendas'),
      ]);

      if (!yearsResponse.ok || !agendasResponse.ok) {
        throw new Error('Failed to fetch initial data');
      }

      years = await yearsResponse.json();
      agendas = await agendasResponse.json();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  });
</script>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: Arial, sans-serif;
  }

  h1 {
    font-size: 2.5rem;
    color: #2c3e50;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  select {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    background-color: #fff;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }

  select:hover {
    border-color: #007bff;
  }

  .loading {
    text-align: center;
    font-size: 1.2rem;
    color: #666;
    margin-top: 2rem;
  }

  .resolutions-list {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  .resolution-item {
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .resolution-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .resolution-item h3 {
    font-size: 1.25rem;
    color: #2c3e50;
    margin: 0 0 0.5rem 0;
  }

  .resolution-item p {
    font-size: 0.9rem;
    color: #666;
    margin: 0 0 1rem 0;
  }

  .resolution-item a {
    color: #007bff;
    text-decoration: none;
    font-weight: bold;
    transition: color 0.3s ease;
  }

  .resolution-item a:hover {
    color: #0056b3;
  }

  .pagination {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
  }

  .pagination button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #fff;
    cursor: pointer;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .pagination button:hover {
    background-color: #007bff;
    color: #fff;
  }

  .pagination button:disabled {
    background-color: #f0f0f0;
    color: #ccc;
    cursor: not-allowed;
  }

  .pagination button.active {
    background-color: #007bff;
    color: #fff;
  }

  .pagination .ellipsis {
    padding: 0.5rem 1rem;
    cursor: default;
  }
</style>

<div class="container">
  <h1>Resolutions</h1>

  <!-- Filters -->
  <div class="filters">
    <select bind:value={selectedYear} on:change={() => { currentPage = 1; fetchResolutions(); }}>
      <option value={null}>Select Year</option>
      {#each years as year}
        <option value={year}>{year}</option>
      {/each}
    </select>

    <select bind:value={selectedAgenda} on:change={() => { currentPage = 1; fetchResolutions(); }}>
      <option value={null}>Select Agenda</option>
      {#each agendas as agenda}
        <option value={agenda.agenda_id}>{agenda.name}</option>
      {/each}
    </select>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <p class="loading">Loading resolutions...</p>
  {:else}
    <!-- Resolutions List -->
    <div class="resolutions-list">
      {#if resolutions.length > 0}
        {#each resolutions as resolution}
          <div class="resolution-item">
            <h3>{resolution.title}</h3>
            <p>Date: {new Date(resolution.date).toLocaleDateString()}</p>
            <a href="/resolutions/details?id={resolution.symbol}" target="_blank">View Details</a>
          </div>
        {/each}
      {:else}
        <p class="loading">No resolutions found.</p>
      {/if}
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button on:click={() => goToPage(1)} disabled={currentPage === 1}>First</button>
      <button on:click={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
      {#each getVisiblePages() as page}
        {#if page === '...'}
          <span class="ellipsis">...</span>
        {:else}
          <button
            on:click={() => goToPage(page)}
            class={currentPage === page ? 'active' : ''}
          >
            {page}
          </button>
        {/if}
      {/each}
      <button on:click={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      <button on:click={() => goToPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
    </div>
  {/if}
</div>