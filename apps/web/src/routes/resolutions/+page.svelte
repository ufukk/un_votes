<script lang="ts">
    import type { PageProps } from "./$types";
    import { page } from "$app/state";
    import Tags from "svelte-tags-input";
    import { onMount } from "svelte";

    let { data }: PageProps = $props();
    let year = $state("2025");
    let subjects: any[] = $state([]);
    let pageNumber: number = $state(1);
    let resolutions: any[] = $state([]);
    let total: number = $state(0);

    async function subjectAutoFill(keyword: string) {
        const results = await fetch("/api/find_subjects", {
            method: "POST",
            body: JSON.stringify({ query: keyword }),
            headers: { "Content-Type": "application/json" },
        });
        const data = await results.json();
        return data;
    }

    async function fetchResolutions() {
        const data = await fetch("/api/resolutions", {
            method: "POST",
            body: JSON.stringify({
                subjectIds:
                    subjects.length > 0 ? subjects.map((val) => val.id) : null,
                year: year,
                page: pageNumber,
            }),
            headers: { "Content-Type": "application/json" },
        });
        resolutions = (await data.json()).results;
        console.log(subjects);
    }

    onMount(async () => {
        await fetchResolutions();
    });
</script>

<main class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
            UN General Assembly Resolutions
        </h1>
        <p class="text-gray-600">
            Browse and analyze voting patterns on UN resolutions
        </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-blue-100 rounded-lg">
                    <i class="fas fa-file-text text-blue-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        Total Resolutions
                    </p>
                    <p class="text-2xl font-bold text-gray-900">
                        {data.numberOfResolutions}
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-green-100 rounded-lg">
                    <i class="fas fa-check text-green-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        General Council
                    </p>
                    <p class="text-2xl font-bold text-gray-900">
                        {data.numberOfGeneralCouncilResolutions}
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-red-100 rounded-lg">
                    <i class="fas fa-times text-red-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        Security Council
                    </p>
                    <p class="text-2xl font-bold text-gray-900">
                        {data.numberOfSecurityCouncilResolutions}
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-yellow-100 rounded-lg">
                    <i class="fas fa-pause text-yellow-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Deferred</p>
                    <p class="text-2xl font-bold text-gray-900"></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters and Controls -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="p-4 border-b border-gray-200">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Session Filter -->
                    <div class="min-w-0">
                        <label
                            class="block text-xs font-medium text-gray-700 mb-1"
                            for="selected_year"><div>{year}</div></label
                        >
                        <select
                            name="selected_year"
                            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onchange={(e) => {
                                year = e.currentTarget.value;
                            }}
                        >
                            <option>All Sessions</option>
                            {#each data.years as year}
                                <option value={year}>{year}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- Topic Filter -->
                    <div class="min-w-0">
                        <label
                            for="agenda"
                            class="block text-xs font-medium text-gray-700 mb-1"
                            >Topic</label
                        >
                        <div class="tags-container">
                            <Tags
                                bind:tags={subjects}
                                autoComplete={subjectAutoFill}
                                autoCompleteKey={"name"}
                            />
                        </div>
                    </div>

                    <!-- Status Filter -->
                    <div class="min-w-0">
                        <label
                            for="votingType"
                            class="block text-xs font-medium text-gray-700 mb-1"
                            >Status</label
                        >
                        <select
                            id="votingType"
                            name="votingType"
                            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Types</option>
                            <option value="GeneralCouncil"
                                >General Council</option
                            >
                            <option value="SecurityCouncil"
                                >Security Council</option
                            >
                        </select>
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <button
                        class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        onclick={fetchResolutions}
                    >
                        <i class="fas fa-filter mr-2"></i>Apply Filters
                    </button>
                </div>
            </div>
        </div>

        <!-- Active Filters -->
        <div class="p-4">
            <div class="flex flex-wrap items-center gap-2"></div>
        </div>
    </div>

    <!-- Results Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        1,247 Resolutions
                    </h3>
                    <div
                        class="flex items-center space-x-2 text-sm text-gray-500"
                    >
                        <label>Show:</label>
                        <select
                            class="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                            <option>25</option>
                            <option>50</option>
                            <option>100</option>
                        </select>
                        <span>per page</span>
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <button
                        class="p-2 text-gray-400 hover:text-gray-600"
                        title="List View"
                    >
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="p-2 text-gray-600" title="Card View">
                        <i class="fas fa-th-large"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Resolution
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Date
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Topic
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Votes
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Status
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- Sample rows -->
                    {#each resolutions as resolution}
                        <tr class="hover:bg-gray-50 cursor-pointer">
                            <td class="px-6 py-4">
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        {resolution.symbol}
                                    </div>
                                    <div
                                        class="text-sm text-gray-500 line-clamp-2"
                                    >
                                        {resolution.title}
                                    </div>
                                </div>
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                                {resolution.date}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span
                                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                >
                                    {resolution.voteSummary}
                                </span>
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                                <div class="flex items-center space-x-2">
                                    <span
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                    >
                                        <i class="fas fa-check mr-1"></i>
                                        {resolution.subjects}
                                    </span>
                                    <span
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                    >
                                        <i class="fas fa-times mr-1"></i>9
                                    </span>
                                    <span
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                                    >
                                        <i class="fas fa-minus mr-1"></i>49
                                    </span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span
                                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                >
                                    Adopted
                                </span>
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                            >
                                <button
                                    class="text-blue-600 hover:text-blue-900 mr-3"
                                    >View</button
                                >
                                <button
                                    class="text-gray-600 hover:text-gray-900"
                                >
                                    <i class="fas fa-bookmark"></i>
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-700">
                    Showing <span class="font-medium">1</span> to
                    <span class="font-medium">25</span>
                    of <span class="font-medium">1,247</span> results
                </div>
                <div class="flex items-center space-x-2">
                    <button
                        class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        disabled
                    >
                        Previous
                    </button>
                    <button
                        class="px-3 py-2 text-sm bg-blue-600 text-white rounded"
                        >1</button
                    >
                    <button
                        class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                        >2</button
                    >
                    <button
                        class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                        >3</button
                    >
                    <span class="px-3 py-2 text-sm text-gray-500">...</span>
                    <button
                        class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                        >50</button
                    >
                    <button
                        class="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</main>

<style>
    .tags-container :global(.svelte-tags-input-tag) {
        color: var(--color-purple-800);
        background-color: var(--color-purple-100);
        border-radius: calc(infinity * 1px);
    }
</style>
