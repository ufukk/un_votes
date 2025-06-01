import * as tf from '@tensorflow/tfjs';
import natural from 'natural';

// Step 1: Define the agenda titles
const titles = [
    "Promotion of sustainable development in post-conflict situations",
    "Protection of children in armed conflict",
    "Peacekeeping operations in Africa",
    "Climate change and its impact on global security",
    "Human rights violations in conflict zones",
    "Environmental protection and sustainable practices"
];

// Step 2: Preprocess the titles (tokenization and stop-word removal)
const tokenizer = new natural.WordTokenizer();
const stopWords = new Set(["of", "in", "and", "the", "on", "its"]); // Common stop words

function preprocessText(text: string): string[] {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return tokens.filter(token => !stopWords.has(token));
}

const processedTitles = titles.map(preprocessText);

// Step 3: Vectorize the titles using TF-IDF-like approach
function computeTfIdf(titles: string[][]): number[][] {
    const termFrequency: Map<string, number>[] = [];
    const documentFrequency: Map<string, number> = new Map();

    // Compute term frequency for each title
    for (const title of titles) {
        const tfMap = new Map<string, number>();
        const uniqueTerms = new Set<string>();
        for (const term of title) {
            tfMap.set(term, (tfMap.get(term) || 0) + 1);
            uniqueTerms.add(term);
        }
        termFrequency.push(tfMap);

        // Update document frequency
        for (const term of uniqueTerms) {
            documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
        }
    }

    // Compute TF-IDF scores
    const tfIdfVectors: number[][] = [];
    const numDocuments = titles.length;
    for (const tfMap of termFrequency) {
        const vector: number[] = [];
        for (const [term, freq] of tfMap.entries()) {
            const idf = Math.log(numDocuments / (documentFrequency.get(term) || 1));
            vector.push(freq * idf);
        }
        tfIdfVectors.push(vector);
    }

    return tfIdfVectors;
}

const tfIdfVectors = computeTfIdf(processedTitles);

// Step 4: Apply K-Means clustering
function kMeansClustering(vectors: number[][], numClusters: number, maxIterations = 100): number[] {
    const centroids = vectors.slice(0, numClusters); // Initialize centroids
    const assignments = new Array(vectors.length).fill(-1);

    for (let iter = 0; iter < maxIterations; iter++) {
        // Assign each vector to the nearest centroid
        for (let i = 0; i < vectors.length; i++) {
            const distances = centroids.map(centroid =>
                tf.losses.meanSquaredError(tf.tensor(vectors[i]), tf.tensor(centroid)).arraySync()
            );
            assignments[i] = distances.indexOf(Math.min(...distances));
        }

        // Update centroids
        const newCentroids = Array.from({ length: numClusters }, () => Array(vectors[0].length).fill(0));
        const counts = new Array(numClusters).fill(0);

        for (let i = 0; i < vectors.length; i++) {
            const cluster = assignments[i];
            newCentroids[cluster] = newCentroids[cluster].map((val, idx) => val + vectors[i][idx]);
            counts[cluster]++;
        }

        for (let c = 0; c < numClusters; c++) {
            newCentroids[c] = newCentroids[c].map(val => val / counts[c]);
        }

        centroids.splice(0, centroids.length, ...newCentroids);
    }

    return assignments;
}

const numClusters = 3;
const clusters = kMeansClustering(tfIdfVectors, numClusters);

// Step 5: Interpret the clusters
console.log("Cluster Assignments:");
titles.forEach((title, i) => {
    console.log(`Title: "${title}" -> Cluster: ${clusters[i]}`);
});

// Step 6: Assign meaningful category names to clusters
const categories = {
    0: "Environment and Sustainability",
    1: "Conflict and Human Rights",
    2: "Peacekeeping and Security"
};

console.log("\nCategorized Agendas:");
titles.forEach((title, i) => {
    console.log(`Title: "${title}" -> Category: ${categories[clusters[i]]}`);
});