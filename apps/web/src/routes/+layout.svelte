<script lang="ts">
	import "../app.css";
	import Sidebar from "../components/Sidebar.svelte";

	let { children } = $props();
</script>

<Sidebar />

<!-- Sidebar overlay for mobile -->
<div
	id="sidebarOverlay"
	class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden hidden"
></div>

<!-- Main Content -->
<div class="lg:ml-64">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 sticky top-0 z-30">
		<div class="flex items-center justify-between px-4 py-3">
			<div class="flex items-center space-x-4">
				<button
					aria-label="-"
					id="sidebarToggle"
					class="text-gray-600 hover:text-gray-900 lg:hidden"
				>
					<i class="fas fa-bars text-xl"></i>
				</button>

				<!-- Breadcrumb -->
				<nav class="hidden sm:flex" aria-label="Breadcrumb">
					<ol class="flex items-center space-x-2 text-sm">
						<li>
							<a
								href="/resolutions"
								class="text-gray-500 hover:text-gray-700"
								>Dashboard</a
							>
						</li>
						<li class="text-gray-400">/</li>
						<li class="text-gray-900 font-medium">Resolutions</li>
					</ol>
				</nav>
			</div>

			<!-- Search Bar -->
			<div class="flex-1 max-w-2xl mx-4">
				<div class="relative">
					<input
						type="text"
						placeholder="Search resolutions, topics, countries..."
						class="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<i class="fas fa-search absolute left-3 top-3 text-gray-400"
					></i>
				</div>
			</div>

			<div class="flex items-center space-x-4">
				<button
					class="p-2 text-gray-600 hover:text-gray-900"
					aria-label="Download"
				>
					<i class="fas fa-download"></i>
				</button>
				<button
					class="p-2 text-gray-600 hover:text-gray-900"
					aria-label="Settings"
				>
					<i class="fas fa-cog"></i>
				</button>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	{@render children()}
</div>

<!-- Loading State (Hidden by default) -->
<div
	id="loadingState"
	class="fixed inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center z-50 hidden"
>
	<div class="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-4">
		<div
			class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
		></div>
		<span class="text-gray-700">Loading resolutions...</span>
	</div>
</div>

<!-- Empty State (Hidden by default) -->
<div
	id="emptyState"
	class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center hidden"
>
	<div
		class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
	>
		<i class="fas fa-search text-gray-400 text-2xl"></i>
	</div>
	<h3 class="text-lg font-medium text-gray-900 mb-2">No resolutions found</h3>
	<p class="text-gray-500 mb-4">
		Try adjusting your search criteria or filters to find what you're
		looking for.
	</p>
	<button
		class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
	>
		Clear All Filters
	</button>
</div>
