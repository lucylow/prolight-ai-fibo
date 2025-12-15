import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  freeApis,
  type RandomUser,
  type Quote,
  type Country,
  type Activity,
  type IPInfo,
} from '@/services/freeApis';
import { Loader2, Image as ImageIcon, Users, Quote as QuoteIcon, Globe, Activity as ActivityIcon, Network } from 'lucide-react';

export default function FreeApisDemo() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [randomUsers, setRandomUsers] = useState<RandomUser[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [dogImages, setDogImages] = useState<string[]>([]);
  const [catImages, setCatImages] = useState<string[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [placeholderImages, setPlaceholderImages] = useState<string[]>([]);

  const setLoadingState = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleGetRandomUsers = async () => {
    setLoadingState('users', true);
    try {
      const users = await freeApis.getRandomUsers(5);
      setRandomUsers(users);
      toast.success(`Fetched ${users.length} random users`);
    } catch (error) {
      toast.error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('users', false);
    }
  };

  const handleGetQuote = async () => {
    setLoadingState('quote', true);
    try {
      const randomQuote = await freeApis.getRandomQuote();
      setQuote(randomQuote);
      toast.success('Fetched inspirational quote');
    } catch (error) {
      toast.error(`Failed to fetch quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('quote', false);
    }
  };

  const handleGetCountries = async () => {
    setLoadingState('countries', true);
    try {
      const allCountries = await freeApis.getAllCountries();
      // Show random 10 countries
      const shuffled = allCountries.sort(() => 0.5 - Math.random());
      setCountries(shuffled.slice(0, 10));
      toast.success(`Fetched ${allCountries.length} countries (showing 10)`);
    } catch (error) {
      toast.error(`Failed to fetch countries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('countries', false);
    }
  };

  const handleGetDogImages = async () => {
    setLoadingState('dogs', true);
    try {
      const images = await freeApis.getRandomDogImages(3);
      setDogImages(images);
      toast.success('Fetched dog images');
    } catch (error) {
      toast.error(`Failed to fetch dog images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('dogs', false);
    }
  };

  const handleGetCatImages = async () => {
    setLoadingState('cats', true);
    try {
      const images = await freeApis.getRandomCatImages(3);
      setCatImages(images);
      toast.success('Fetched cat images');
    } catch (error) {
      toast.error(`Failed to fetch cat images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('cats', false);
    }
  };

  const handleGetActivity = async () => {
    setLoadingState('activity', true);
    try {
      const randomActivity = await freeApis.getRandomActivity();
      setActivity(randomActivity);
      toast.success('Fetched activity suggestion');
    } catch (error) {
      toast.error(`Failed to fetch activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('activity', false);
    }
  };

  const handleGetIPInfo = async () => {
    setLoadingState('ip', true);
    try {
      const info = await freeApis.getIPInfo();
      setIpInfo(info);
      toast.success('Fetched IP information');
    } catch (error) {
      toast.error(`Failed to fetch IP info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingState('ip', false);
    }
  };

  const handleGetPlaceholderImages = () => {
    const images = freeApis.getRandomImageUrls(6, 400, 300);
    setPlaceholderImages(images);
    toast.success('Generated placeholder image URLs');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Free External APIs Demo</h1>
        <p className="text-muted-foreground">
          Collection of public APIs that don't require API keys
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Random Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Random Users
            </CardTitle>
            <CardDescription>Generate random user profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetRandomUsers}
              disabled={loading.users}
              className="w-full"
            >
              {loading.users ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Random Users'
              )}
            </Button>
            {randomUsers.length > 0 && (
              <div className="space-y-2">
                {randomUsers.map((user, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 border rounded">
                    <img
                      src={user.picture.thumbnail}
                      alt={`${user.name.first} ${user.name.last}`}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name.first} {user.name.last}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QuoteIcon className="h-5 w-5" />
              Inspirational Quotes
            </CardTitle>
            <CardDescription>Get daily inspiration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetQuote}
              disabled={loading.quote}
              className="w-full"
            >
              {loading.quote ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Random Quote'
              )}
            </Button>
            {quote && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm italic mb-2">"{quote.text}"</p>
                <p className="text-xs text-muted-foreground">— {quote.author}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Countries
            </CardTitle>
            <CardDescription>Explore world countries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetCountries}
              disabled={loading.countries}
              className="w-full"
            >
              {loading.countries ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Countries'
              )}
            </Button>
            {countries.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {countries.map((country, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 border rounded">
                    <img
                      src={country.flags.png}
                      alt={country.name.common}
                      className="w-8 h-6 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {country.name.common}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {country.region} • {country.population.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dog Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Dog Images
            </CardTitle>
            <CardDescription>Random dog photos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetDogImages}
              disabled={loading.dogs}
              className="w-full"
            >
              {loading.dogs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Dog Images'
              )}
            </Button>
            {dogImages.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {dogImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Dog ${idx + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cat Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Cat Images
            </CardTitle>
            <CardDescription>Random cat photos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetCatImages}
              disabled={loading.cats}
              className="w-full"
            >
              {loading.cats ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Cat Images'
              )}
            </Button>
            {catImages.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {catImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Cat ${idx + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Activity Suggestions
            </CardTitle>
            <CardDescription>Find something to do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetActivity}
              disabled={loading.activity}
              className="w-full"
            >
              {loading.activity ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get Activity'
              )}
            </Button>
            {activity && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">{activity.activity}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{activity.type}</Badge>
                  <Badge variant="outline">{activity.participants} participants</Badge>
                  <Badge variant="outline">
                    {activity.price === 0 ? 'Free' : `$${activity.price}`}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              IP Information
            </CardTitle>
            <CardDescription>Get your public IP details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetIPInfo}
              disabled={loading.ip}
              className="w-full"
            >
              {loading.ip ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get IP Info'
              )}
            </Button>
            {ipInfo && (
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div>
                  <span className="font-medium">IP:</span> {ipInfo.ip}
                </div>
                {ipInfo.city && (
                  <div>
                    <span className="font-medium">Location:</span> {ipInfo.city}
                    {ipInfo.region && `, ${ipInfo.region}`}
                    {ipInfo.country && `, ${ipInfo.country}`}
                  </div>
                )}
                {ipInfo.org && (
                  <div>
                    <span className="font-medium">ISP:</span> {ipInfo.org}
                  </div>
                )}
                {ipInfo.timezone && (
                  <div>
                    <span className="font-medium">Timezone:</span> {ipInfo.timezone}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placeholder Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Placeholder Images
            </CardTitle>
            <CardDescription>Generate placeholder image URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGetPlaceholderImages}
              className="w-full"
            >
              Generate Placeholders
            </Button>
            {placeholderImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {placeholderImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Placeholder ${idx + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available APIs</CardTitle>
          <CardDescription>
            All these APIs are free and don't require API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Random User API</h4>
              <p className="text-muted-foreground">
                Generate random user profiles with avatars, names, and locations
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">ZenQuotes API</h4>
              <p className="text-muted-foreground">
                Get inspirational quotes for daily motivation
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">REST Countries</h4>
              <p className="text-muted-foreground">
                Access comprehensive country data and flags
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Picsum Photos</h4>
              <p className="text-muted-foreground">
                Generate placeholder images for development
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dog CEO API</h4>
              <p className="text-muted-foreground">
                Random dog images from various breeds
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">The Cat API</h4>
              <p className="text-muted-foreground">
                Random cat images for your projects
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Bored API</h4>
              <p className="text-muted-foreground">
                Get activity suggestions when you're bored
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">IPify & IPAPI</h4>
              <p className="text-muted-foreground">
                Get public IP address and location information
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">JSONPlaceholder</h4>
              <p className="text-muted-foreground">
                Fake REST API for testing and prototyping
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

