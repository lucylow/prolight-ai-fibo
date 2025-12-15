/**
 * Free External APIs Service
 * Collection of public APIs that don't require API keys
 */

// ============================================================================
// Types
// ============================================================================

export interface RandomUser {
  gender: string;
  name: {
    title: string;
    first: string;
    last: string;
  };
  email: string;
  picture: {
    large: string;
    medium: string;
    thumbnail: string;
  };
  location: {
    city: string;
    country: string;
  };
}

export interface Quote {
  text: string;
  author: string;
  tag?: string;
}

export interface Country {
  name: {
    common: string;
    official: string;
  };
  capital: string[];
  region: string;
  population: number;
  flags: {
    png: string;
    svg: string;
  };
}

export interface DogImage {
  message: string;
  status: string;
}

export interface CatImage {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface Activity {
  activity: string;
  type: string;
  participants: number;
  price: number;
  link: string;
  key: string;
  accessibility: number;
}

export interface IPInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}

// ============================================================================
// Random User API (https://randomuser.me/)
// ============================================================================

/**
 * Get random user data
 * @param count Number of users to fetch (default: 1, max: 5000)
 * @param gender Filter by gender: 'male' | 'female'
 * @param nationality Filter by nationality (e.g., 'us', 'gb', 'fr')
 */
export async function getRandomUsers(
  count: number = 1,
  gender?: 'male' | 'female',
  nationality?: string
): Promise<RandomUser[]> {
  const params = new URLSearchParams();
  params.append('results', Math.min(count, 5000).toString());
  if (gender) params.append('gender', gender);
  if (nationality) params.append('nat', nationality);

  const response = await fetch(`https://randomuser.me/api/?${params}`);
  if (!response.ok) {
    throw new Error(`Random User API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.results;
}

// ============================================================================
// Quotes API (https://zenquotes.io/)
// ============================================================================

/**
 * Get random inspirational quote
 */
export async function getRandomQuote(): Promise<Quote> {
  const response = await fetch('https://zenquotes.io/api/random');
  if (!response.ok) {
    throw new Error(`Quotes API error: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    text: data[0].q,
    author: data[0].a,
  };
}

/**
 * Get today's quote
 */
export async function getTodayQuote(): Promise<Quote> {
  const response = await fetch('https://zenquotes.io/api/today');
  if (!response.ok) {
    throw new Error(`Quotes API error: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    text: data[0].q,
    author: data[0].a,
  };
}

// ============================================================================
// REST Countries API (https://restcountries.com/)
// ============================================================================

/**
 * Get all countries
 */
export async function getAllCountries(): Promise<Country[]> {
  const response = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,region,population,flags');
  if (!response.ok) {
    throw new Error(`Countries API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get country by name
 */
export async function getCountryByName(name: string): Promise<Country[]> {
  const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,region,population,flags`);
  if (!response.ok) {
    throw new Error(`Countries API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get country by code
 */
export async function getCountryByCode(code: string): Promise<Country> {
  const response = await fetch(`https://restcountries.com/v3.1/alpha/${code}?fields=name,capital,region,population,flags`);
  if (!response.ok) {
    throw new Error(`Countries API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

// ============================================================================
// Picsum Photos (https://picsum.photos/)
// ============================================================================

/**
 * Get random placeholder image URL
 * @param width Image width (default: 800)
 * @param height Image height (default: 600)
 * @param seed Optional seed for consistent images
 */
export function getRandomImageUrl(width: number = 800, height: number = 600, seed?: string): string {
  const baseUrl = 'https://picsum.photos';
  if (seed) {
    return `${baseUrl}/seed/${seed}/${width}/${height}`;
  }
  return `${baseUrl}/${width}/${height}?random=${Date.now()}`;
}

/**
 * Get list of random images
 * @param count Number of images
 * @param width Image width
 * @param height Image height
 */
export function getRandomImageUrls(count: number, width: number = 800, height: number = 600): string[] {
  return Array.from({ length: count }, (_, i) => 
    getRandomImageUrl(width, height, undefined)
  );
}

// ============================================================================
// Dog API (https://dog.ceo/api/)
// ============================================================================

/**
 * Get random dog image
 */
export async function getRandomDogImage(): Promise<string> {
  const response = await fetch('https://dog.ceo/api/breeds/image/random');
  if (!response.ok) {
    throw new Error(`Dog API error: ${response.statusText}`);
  }
  const data: DogImage = await response.json();
  return data.message;
}

/**
 * Get random dog images
 * @param count Number of images
 */
export async function getRandomDogImages(count: number = 1): Promise<string[]> {
  const response = await fetch(`https://dog.ceo/api/breeds/image/random/${count}`);
  if (!response.ok) {
    throw new Error(`Dog API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.message;
}

/**
 * Get list of all dog breeds
 */
export async function getDogBreeds(): Promise<string[]> {
  const response = await fetch('https://dog.ceo/api/breeds/list/all');
  if (!response.ok) {
    throw new Error(`Dog API error: ${response.statusText}`);
  }
  const data = await response.json();
  return Object.keys(data.message);
}

/**
 * Get random image of specific breed
 */
export async function getDogBreedImage(breed: string): Promise<string> {
  const response = await fetch(`https://dog.ceo/api/breed/${breed}/images/random`);
  if (!response.ok) {
    throw new Error(`Dog API error: ${response.statusText}`);
  }
  const data: DogImage = await response.json();
  return data.message;
}

// ============================================================================
// Cat API (https://thecatapi.com/) - Free tier, no key required
// ============================================================================

/**
 * Get random cat image
 */
export async function getRandomCatImage(): Promise<string> {
  const response = await fetch('https://api.thecatapi.com/v1/images/search');
  if (!response.ok) {
    throw new Error(`Cat API error: ${response.statusText}`);
  }
  const data: CatImage[] = await response.json();
  return data[0].url;
}

/**
 * Get random cat images
 * @param count Number of images (max: 10)
 */
export async function getRandomCatImages(count: number = 1): Promise<string[]> {
  const limit = Math.min(count, 10);
  const response = await fetch(`https://api.thecatapi.com/v1/images/search?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Cat API error: ${response.statusText}`);
  }
  const data: CatImage[] = await response.json();
  return data.map(cat => cat.url);
}

// ============================================================================
// Bored API (https://www.boredapi.com/)
// ============================================================================

/**
 * Get random activity suggestion
 */
export async function getRandomActivity(): Promise<Activity> {
  const response = await fetch('https://www.boredapi.com/api/activity');
  if (!response.ok) {
    throw new Error(`Bored API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get activity by type
 */
export async function getActivityByType(type: string): Promise<Activity> {
  const response = await fetch(`https://www.boredapi.com/api/activity?type=${type}`);
  if (!response.ok) {
    throw new Error(`Bored API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get activity by participants count
 */
export async function getActivityByParticipants(participants: number): Promise<Activity> {
  const response = await fetch(`https://www.boredapi.com/api/activity?participants=${participants}`);
  if (!response.ok) {
    throw new Error(`Bored API error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// IPify (https://www.ipify.org/)
// ============================================================================

/**
 * Get user's public IP address
 */
export async function getPublicIP(): Promise<string> {
  const response = await fetch('https://api.ipify.org?format=json');
  if (!response.ok) {
    throw new Error(`IPify API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.ip;
}

/**
 * Get IP info (using ipapi.co - free tier, no key required)
 */
export async function getIPInfo(ip?: string): Promise<IPInfo> {
  const url = ip 
    ? `https://ipapi.co/${ip}/json/`
    : 'https://ipapi.co/json/';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IP Info API error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// JSONPlaceholder (https://jsonplaceholder.typicode.com/)
// ============================================================================

/**
 * Get posts (for testing/development)
 */
export async function getPosts(limit?: number) {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts');
  if (!response.ok) {
    throw new Error(`JSONPlaceholder API error: ${response.statusText}`);
  }
  const data = await response.json();
  return limit ? data.slice(0, limit) : data;
}

/**
 * Get post by ID
 */
export async function getPost(id: number) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) {
    throw new Error(`JSONPlaceholder API error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// HTTPBin (https://httpbin.org/) - For testing HTTP requests
// ============================================================================

/**
 * Test GET request
 */
export async function testGetRequest() {
  const response = await fetch('https://httpbin.org/get');
  if (!response.ok) {
    throw new Error(`HTTPBin API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Test POST request
 */
export async function testPostRequest(data: Record<string, unknown>) {
  const response = await fetch('https://httpbin.org/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTPBin API error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// Export all functions as a service object
// ============================================================================

export const freeApis = {
  // Random User
  getRandomUsers,
  
  // Quotes
  getRandomQuote,
  getTodayQuote,
  
  // Countries
  getAllCountries,
  getCountryByName,
  getCountryByCode,
  
  // Images
  getRandomImageUrl,
  getRandomImageUrls,
  getRandomDogImage,
  getRandomDogImages,
  getDogBreeds,
  getDogBreedImage,
  getRandomCatImage,
  getRandomCatImages,
  
  // Activities
  getRandomActivity,
  getActivityByType,
  getActivityByParticipants,
  
  // IP
  getPublicIP,
  getIPInfo,
  
  // Testing
  getPosts,
  getPost,
  testGetRequest,
  testPostRequest,
};

