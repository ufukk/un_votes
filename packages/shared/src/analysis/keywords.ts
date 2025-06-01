import natural from 'natural';
import nlp from 'compromise';

interface KeywordExtractorOptions {
    minWordLength: number;
    excludeCommonWords: boolean;
    includeAcronyms: boolean;
  }
  
  const defaultOptions: KeywordExtractorOptions = {
    minWordLength: 3,
    excludeCommonWords: true,
    includeAcronyms: true
  };
  
  export function extractDynamicKeywords(text: string, options: Partial<KeywordExtractorOptions> = {}): string[] {
    const opts = { ...defaultOptions, ...options };
    
    // Common words to exclude
    const commonWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
      'will', 'with', 'their', 'this', 'but', 'they', 'have', 'had', 'what',
      'when', 'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'over', 'than', 'too',
      'very', 'can', 'will', 'just', 'should', 'now', 'including'
    ]);
  
    // Split the text into two parts based on the period
    const [mainText, categories] = text.split('.');
    
    const keywords = new Set<string>();
    
    // Process the main text
    const processText = (text: string) => {
      // Split on common delimiters
      const words = text.split(/[\s,\-–]+/);
      
      let i = 0;
      while (i < words.length) {
        const word = words[i];
        
        // Skip empty strings and common words
        if (!word || (opts.excludeCommonWords && commonWords.has(word.toLowerCase()))) {
          i++;
          continue;
        }
        
        // Handle acronyms and uppercase terms
        if (opts.includeAcronyms && word.toUpperCase() === word && word.length >= 2) {
          keywords.add(word);
          i++;
          continue;
        }
        
        // Look for proper nouns and multi-word phrases
        if (word.charAt(0).toUpperCase() === word.charAt(0)) {
          let phrase = [word];
          let j = i + 1;
          while (j < words.length && 
                 words[j] && 
                 (words[j].charAt(0).toUpperCase() === words[j].charAt(0) || 
                  commonWords.has(words[j].toLowerCase()))) {
            phrase.push(words[j]);
            j++;
          }
          if (phrase.length > 1) {
            keywords.add(phrase.join(' '));
            i = j;
            continue;
          }
        }
        
        // Add individual words that meet the minimum length requirement
        if (word.length >= opts.minWordLength) {
          keywords.add(word);
        }
        
        i++;
      }
    };
    
    // Process main text
    processText(mainText);
    
    // Process categories (after --)
    if (categories) {
      const categoryParts = categories.split('--');
      categoryParts.forEach(part => {
        const cleanPart = part.trim();
        if (cleanPart) {
          keywords.add(cleanPart);
        }
      });
    }
    
    // Post-process keywords
    return Array.from(keywords)
      .filter(keyword => keyword.length >= opts.minWordLength)
      .map(keyword => keyword.trim())
      .filter(keyword => keyword);
  }
  
export function extractKeywords2(input: string): string[] {
    const doc = nlp(input);
  
    // Extract nouns, proper nouns, and adjectives
    const nouns = doc.nouns().out('array');
    const properNouns = doc.match('#ProperNoun').out('array');
    const adjectives = doc.adjectives().out('array');
  
    // Combine all extracted terms
    const keywords = [...nouns, ...properNouns, ...adjectives];
  
    // Remove duplicates and return unique keywords
    return [...new Set(keywords)];
  }


function extractProperNouns(text: string): string[] {
    const doc = nlp(text);
    // Extract proper nouns (capitalized words that are not at the start of a sentence)
    const properNouns = doc.match('#ProperNoun').out('array');
    return properNouns;
  }

// Function to extract keywords
export function extractKeywords(titles: string[]): string[] {
  const stopWords = new Set(natural.stopwords); // Load stop words
  const keywords = new Set<string>();

  titles.forEach(title => {
    // Remove prefixes like "S/78 [23]"
    const cleanedTitle = title.replace(/^[AS]\/[\d\w]+[ \w-\d]+[\/[]+[\d\] ]+/, '');
    // Tokenize the title
    const nouns = extractNouns(cleanedTitle)
    natural.PorterStemmer.removeStopWords(nouns)
    // Remove stop words and add to keywords set
    nouns.forEach(token => {
        const properNouns = extractProperNouns(token);
        keywords.add(token);
    });
  });

  return Array.from(keywords);
}

export function extractNouns(text: string): string[] {
    const doc = nlp(text);
    return doc.nouns().out('array');
}