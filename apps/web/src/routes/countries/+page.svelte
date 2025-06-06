<main class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
            UN Member Countries
        </h1>
        <p class="text-gray-600">
            Browse and analyze voting patterns by country
        </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-blue-100 rounded-lg">
                    <i class="fas fa-globe text-blue-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        Total Countries
                    </p>
                    <p class="text-2xl font-bold text-gray-900">193</p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-green-100 rounded-lg">
                    <i class="fas fa-users text-green-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        Active Members
                    </p>
                    <p class="text-2xl font-bold text-gray-900">193</p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-purple-100 rounded-lg">
                    <i class="fas fa-map text-purple-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">Regions</p>
                    <p class="text-2xl font-bold text-gray-900">5</p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
                <div class="p-2 bg-orange-100 rounded-lg">
                    <i class="fas fa-chart-line text-orange-600"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">
                        Avg Participation
                    </p>
                    <p class="text-2xl font-bold text-gray-900">94.2%</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters and Controls -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="p-4 border-b border-gray-200">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Region Filter -->
                    <div class="min-w-0">
                        <label
                            class="block text-xs font-medium text-gray-700 mb-1"
                            >Region</label
                        >
                        <select
                            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Regions</option>
                            <option>Africa</option>
                            <option>Asia-Pacific</option>
                            <option>Eastern Europe</option>
                            <option>Latin America & Caribbean</option>
                            <option>Western Europe & Others</option>
                        </select>
                    </div>

                    <!-- Membership Status Filter -->
                    <div class="min-w-0">
                        <label
                            class="block text-xs font-medium text-gray-700 mb-1"
                            >Status</label
                        >
                        <select
                            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Status</option>
                            <option>Active Member</option>
                            <option>Observer</option>
                            <option>Former Member</option>
                        </select>
                    </div>

                    <!-- Join Date Filter -->
                    <div class="min-w-0">
                        <label
                            class="block text-xs font-medium text-gray-700 mb-1"
                            >Join Period</label
                        >
                        <select
                            class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Periods</option>
                            <option>1945-1950 (Founding)</option>
                            <option>1950-1970</option>
                            <option>1970-1990</option>
                            <option>1990-2010</option>
                            <option>2010-Present</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <button
                        class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <i class="fas fa-filter mr-2"></i>Apply Filters
                    </button>
                    <button
                        class="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Clear All
                    </button>
                </div>
            </div>
        </div>

        <!-- Active Filters -->
        <div class="p-4">
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-gray-600">Active filters:</span>
                <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                    Asia-Pacific
                    <button class="ml-1 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
                <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                    Active Member
                    <button class="ml-1 text-green-600 hover:text-green-800">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
            </div>
        </div>
    </div>

    <!-- Results Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        193 Countries
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
                            Country
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            UN Name
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Code
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Region
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Joined
                            <i class="fas fa-sort ml-1"></i>
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                            Voting Activity
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
                    <tr class="hover:bg-gray-50 cursor-pointer">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-8 h-5 mr-3 rounded border border-gray-200 overflow-hidden"
                                >
                                    <div
                                        class="w-full h-full bg-gradient-to-r from-blue-500 to-red-500"
                                    ></div>
                                </div>
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        Afghanistan
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        Islamic Republic of Afghanistan
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Afghanistan
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            <div class="flex items-center space-x-2">
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AF</span
                                >
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AFG</span
                                >
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                            >
                                Asia-Pacific
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Nov 19, 1946
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="flex-1 bg-gray-200 rounded-full h-2 mr-2"
                                >
                                    <div
                                        class="bg-green-500 h-2 rounded-full"
                                        style="width: 87%"
                                    ></div>
                                </div>
                                <span class="text-sm text-gray-600">87%</span>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        >
                            <button
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                >View</button
                            >
                            <button class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </td>
                    </tr>

                    <tr class="hover:bg-gray-50 cursor-pointer">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-8 h-5 mr-3 rounded border border-gray-200 overflow-hidden"
                                >
                                    <div
                                        class="w-full h-full bg-gradient-to-r from-red-500 to-black"
                                    ></div>
                                </div>
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        Albania
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        Republic of Albania
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Albania
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            <div class="flex items-center space-x-2">
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AL</span
                                >
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >ALB</span
                                >
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                                Eastern Europe
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Dec 14, 1955
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="flex-1 bg-gray-200 rounded-full h-2 mr-2"
                                >
                                    <div
                                        class="bg-green-500 h-2 rounded-full"
                                        style="width: 92%"
                                    ></div>
                                </div>
                                <span class="text-sm text-gray-600">92%</span>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        >
                            <button
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                >View</button
                            >
                            <button class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </td>
                    </tr>

                    <tr class="hover:bg-gray-50 cursor-pointer">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-8 h-5 mr-3 rounded border border-gray-200 overflow-hidden"
                                >
                                    <div
                                        class="w-full h-full bg-gradient-to-r from-green-500 via-white to-red-500"
                                    ></div>
                                </div>
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        Algeria
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        People's Democratic Republic of Algeria
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Algeria
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            <div class="flex items-center space-x-2">
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >DZ</span
                                >
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >DZA</span
                                >
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                            >
                                Africa
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Oct 8, 1962
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="flex-1 bg-gray-200 rounded-full h-2 mr-2"
                                >
                                    <div
                                        class="bg-green-500 h-2 rounded-full"
                                        style="width: 95%"
                                    ></div>
                                </div>
                                <span class="text-sm text-gray-600">95%</span>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        >
                            <button
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                >View</button
                            >
                            <button class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </td>
                    </tr>

                    <tr class="hover:bg-gray-50 cursor-pointer">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-8 h-5 mr-3 rounded border border-gray-200 overflow-hidden"
                                >
                                    <div
                                        class="w-full h-full bg-gradient-to-r from-blue-500 to-red-500"
                                    ></div>
                                </div>
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        Andorra
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        Principality of Andorra
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Andorra
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            <div class="flex items-center space-x-2">
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AD</span
                                >
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AND</span
                                >
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                                Western Europe
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Jul 28, 1993
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="flex-1 bg-gray-200 rounded-full h-2 mr-2"
                                >
                                    <div
                                        class="bg-green-500 h-2 rounded-full"
                                        style="width: 89%"
                                    ></div>
                                </div>
                                <span class="text-sm text-gray-600">89%</span>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        >
                            <button
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                >View</button
                            >
                            <button class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </td>
                    </tr>

                    <tr class="hover:bg-gray-50 cursor-pointer">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-8 h-5 mr-3 rounded border border-gray-200 overflow-hidden"
                                >
                                    <div
                                        class="w-full h-full bg-gradient-to-r from-red-500 via-black to-yellow-500"
                                    ></div>
                                </div>
                                <div>
                                    <div
                                        class="text-sm font-medium text-gray-900"
                                    >
                                        Angola
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        Republic of Angola
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Angola
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            <div class="flex items-center space-x-2">
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AO</span
                                >
                                <span
                                    class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                                    >AGO</span
                                >
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                            >
                                Africa
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                            Dec 1, 1976
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div
                                    class="flex-1 bg-gray-200 rounded-full h-2 mr-2"
                                >
                                    <div
                                        class="bg-green-500 h-2 rounded-full"
                                        style="width: 91%"
                                    ></div>
                                </div>
                                <span class="text-sm text-gray-600">91%</span>
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        >
                            <button
                                class="text-blue-600 hover:text-blue-900 mr-3"
                                >View</button
                            >
                            <button class="text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-700">
                    Showing <span class="font-medium">1</span> to
                    <span class="font-medium">25</span>
                    of <span class="font-medium">193</span> results
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
                        >8</button
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
