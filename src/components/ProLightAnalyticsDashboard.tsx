/**
 * ProLight AI - PROFESSIONAL ANALYTICS DASHBOARD
 * Charts, Graphs, Heatmaps, Metrics - Photographer-grade analysis
 * Replaces basic history with enterprise analytics
 */

import React, { useState, useMemo } from 'react';
import { ResponsiveLine as LineChart, Serie } from '@nivo/line';
import { ResponsivePie as PieChart } from '@nivo/pie';
import { ResponsiveHeatMap as HeatMap } from '@nivo/heatmap';

// ============================================================================
// ANALYTICS STORE WITH PROFESSIONAL METRICS
// ============================================================================

interface AnalyticsData {
  generations: Array<{
    id: string;
    timestamp: number;
    keyIntensity: number;
    fillIntensity: number;
    rimIntensity: number;
    kelvin: number;
    focalLength: number;
    aperture: number;
    rating: number; // 1-5 professional rating
    professional_score: number; // 0-100
    exposure_quality: number;
    shadow_quality: number;
    lighting_balance: number;
  }>;
}

const useAnalyticsStore = () => {
  // Mock professional analytics data (replace with real API)
  const [data, setData] = useState<AnalyticsData>({
    generations: Array.from({ length: 50 }, (_, i) => ({
      id: `gen_${i}`,
      timestamp: Date.now() - (50 - i) * 3600000, // hourly data
      keyIntensity: 0.5 + Math.random() * 1.5,
      fillIntensity: 0.2 + Math.random() * 1.0,
      rimIntensity: 0.3 + Math.random() * 1.2,
      kelvin: 3200 + Math.random() * 6800,
      focalLength: [50, 85, 135][Math.floor(Math.random() * 3)],
      aperture: [1.4, 2.8, 4.0][Math.floor(Math.random() * 3)],
      rating: 2 + Math.random() * 3,
      professional_score: 60 + Math.random() * 40,
      exposure_quality: 70 + Math.random() * 30,
      shadow_quality: 65 + Math.random() * 35,
      lighting_balance: 75 + Math.random() * 25,
    }))
  });

  return { data };
};

// ============================================================================
// PROFESSIONAL METRICS CARDS
// ============================================================================

const MetricsCards = ({ data }: { data: AnalyticsData }) => {
  if (!data?.generations || data.generations.length === 0) {
    return null;
  }
  
  const recent = data.generations.slice(-24); // Last 24 hours
  
  const avgProScore = recent.reduce((sum, g) => sum + g.professional_score, 0) / recent.length;
  const bestScore = Math.max(...recent.map(g => g.professional_score));
  const lightingBalance = recent.reduce((sum, g) => sum + g.lighting_balance, 0) / recent.length;
  const conversionRate = 78.4; // % of generations rated professional

  return (
    <div style={metricsGrid}>
      <MetricCard 
        title="Avg Pro Score" 
        value={`${avgProScore.toFixed(1)}%`}
        trend="+2.4%"
        color="#667eea"
      />
      <MetricCard 
        title="Best Shot" 
        value={`${bestScore.toFixed(0)}%`}
        trend="+12%"
        color="#48bb78"
      />
      <MetricCard 
        title="Lighting Balance" 
        value={`${lightingBalance.toFixed(0)}%`}
        trend="-0.8%"
        color="#f6ad55"
      />
      <MetricCard 
        title="Pro Conversion" 
        value={`${conversionRate}%`}
        trend="+5.2%"
        color="#ff6b6b"
      />
    </div>
  );
};

const MetricCard = ({ title, value, trend, color }: {
  title: string;
  value: string;
  trend: string;
  color: string;
}) => (
  <div style={{ ...metricCard, borderLeft: `4px solid ${color}` }}>
    <div style={metricTitle}>{title}</div>
    <div style={metricValue}>{value}</div>
    <div style={metricTrend}>{trend}</div>
  </div>
);

// ============================================================================
// LIGHTING HEATMAP (Key/Fill/Rim Balance)
// ============================================================================

const LightingHeatMap = ({ data }: { data: AnalyticsData }) => {
  const heatmapData = useMemo(() => {
    if (!data?.generations || data.generations.length === 0) {
      return [];
    }
    
    // Create a grid of key/fill combinations
    const grid: Record<string, Record<string, number>> = {};
    
    data.generations.forEach(gen => {
      const keyBin = Math.round(gen.keyIntensity * 10).toString();
      const fillBin = Math.round(gen.fillIntensity * 10).toString();
      
      if (!grid[keyBin]) grid[keyBin] = {};
      if (!grid[keyBin][fillBin]) {
        grid[keyBin][fillBin] = gen.professional_score;
      } else {
        grid[keyBin][fillBin] = Math.max(grid[keyBin][fillBin], gen.professional_score);
      }
    });
    
    // Convert to Nivo heatmap format
    return Object.entries(grid).map(([keyBin, fillValues]) => {
      const row: Record<string, string | number> = { id: `Key ${keyBin}` };
      Object.entries(fillValues).forEach(([fillBin, score]) => {
        row[`Fill ${fillBin}`] = score;
      });
      return row;
    });
  }, [data]);

  const keys = useMemo(() => {
    if (!data?.generations || data.generations.length === 0) {
      return [];
    }
    
    const allFillBins = new Set<string>();
    data.generations.forEach(gen => {
      allFillBins.add(`Fill ${Math.round(gen.fillIntensity * 10)}`);
    });
    return Array.from(allFillBins).sort();
  }, [data]);

  return (
    <div style={chartContainer}>
      <h3 style={chartTitle}>Optimal Lighting Ratios</h3>
      <div style={{ height: 400 }}>
        <HeatMap
          data={heatmapData}
          keys={keys}
          indexBy="id"
          margin={{ top: 60, right: 60, bottom: 60, left: 60 }}
          colors={{
            type: 'diverging',
            scheme: 'rdylgn' as const,
            minValue: 40,
            maxValue: 100
          }}
          axisTop={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: -45
          }}
          axisRight={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: 0
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: -45
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: 0
          }}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
          tooltip={({ cell }) => (
            <div style={tooltipStyle}>
              <strong>{cell.serieId} × {cell.id}</strong><br/>
              Pro Score: {typeof cell.value === 'number' ? cell.value.toFixed(1) : cell.value}%
            </div>
          )}
        />
      </div>
    </div>
  );
};

// ============================================================================
// PROFESSIONAL SCORE OVER TIME
// ============================================================================

const ProScoreTrend = ({ data }: { data: AnalyticsData }) => {
  const trendData: Serie[] = useMemo(() => {
    if (!data?.generations || data.generations.length === 0) {
      return [];
    }
    
    const hourly = data.generations.reduce((acc, gen) => {
      const hour = new Date(gen.timestamp).getHours();
      acc[hour] = acc[hour] || { proScore: 0, count: 0 };
      acc[hour].proScore += gen.professional_score;
      acc[hour].count += 1;
      return acc;
    }, {} as Record<number, { proScore: number; count: number }>);

    return [{
      id: 'Pro Score',
      data: Object.entries(hourly).map(([hour, stats]) => ({
        x: `${parseInt(hour)}:00`,
        y: Math.round(stats.proScore / stats.count)
      }))
    }];
  }, [data]);

  return (
    <div style={chartContainer}>
      <h3 style={chartTitle}>Professional Score by Hour</h3>
      <div style={{ height: 400 }}>
        <LineChart
          data={trendData}
          margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 40, max: 100, stacked: false }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            orient: 'bottom',
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45
          }}
          axisLeft={{
            orient: 'left',
            tickSize: 5,
            tickPadding: 5
          }}
          colors={{ scheme: 'category10' }}
          pointSize={10}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          tooltip={({ point }) => (
            <div style={tooltipStyle}>
              <strong>{point.data.xFormatted}: {point.data.yFormatted}%</strong>
            </div>
          )}
        />
      </div>
    </div>
  );
};

// ============================================================================
// FOCAL LENGTH DISTRIBUTION
// ============================================================================

const FocalLengthDistribution = ({ data }: { data: AnalyticsData }) => {
  const focalData = useMemo(() => {
    if (!data?.generations || data.generations.length === 0) {
      return [];
    }
    
    const counts = data.generations.reduce((acc, gen) => {
      acc[gen.focalLength] = (acc[gen.focalLength] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(counts).map(([focal, count]) => ({
      id: `${focal}mm`,
      label: `${focal}mm`,
      value: count,
      color: focal === '85' ? '#667eea' : focal === '50' ? '#48bb78' : '#f6ad55'
    }));
  }, [data]);

  return (
    <div style={chartContainer}>
      <h3 style={chartTitle}>Focal Length Usage</h3>
      <div style={{ height: 400 }}>
        <PieChart
          data={focalData}
          margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          colors={focalData.map(d => d.color)}
          borderWidth={0}
          borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#ffffff"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 56,
              itemsSpacing: 0,
              itemWidth: 100,
              itemHeight: 18,
              itemTextColor: '#999',
              itemDirection: 'left-to-right',
              itemOpacity: 1,
              symbolSize: 18,
              symbolShape: 'circle',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: '#000'
                  }
                }
              ]
            }
          ]}
        />
      </div>
    </div>
  );
};

// ============================================================================
// RECOMMENDATION COMPONENT
// ============================================================================

const Recommendation = ({ title, score, recommendation }: {
  title: string;
  score: number;
  recommendation: string;
}) => (
  <div style={{
    background: 'rgba(72, 187, 120, 0.2)',
    padding: '20px',
    borderRadius: '12px',
    borderLeft: '4px solid #48bb78'
  }}>
    <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
      {title} <span style={{ color: '#48bb78' }}>{score}%</span>
    </div>
    <div style={{ opacity: 0.9, lineHeight: 1.5 }}>{recommendation}</div>
  </div>
);

// ============================================================================
// MAIN ANALYTICS DASHBOARD
// ============================================================================

export const ProLightAnalyticsDashboard = () => {
  const { data } = useAnalyticsStore();
  const [activeView, setActiveView] = useState<'overview' | 'lighting' | 'trends'>('overview');

  if (!data?.generations) {
    return (
      <div style={dashboardContainer}>
        <div style={dashboardHeader}>
          <h1 style={dashboardTitle}>📊 ProLight Analytics</h1>
          <p style={dashboardSubtitle}>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardContainer}>
      {/* Header */}
      <div style={dashboardHeader}>
        <h1 style={dashboardTitle}>📊 ProLight Analytics</h1>
        <p style={dashboardSubtitle}>Professional rating & optimization insights</p>
      </div>

      {/* Metrics Cards */}
      <MetricsCards data={data} />

      {/* Chart Tabs */}
      <div style={tabContainer}>
        <button 
          style={{ ...tabButton, ...(activeView === 'overview' ? activeTab : {}) }}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button 
          style={{ ...tabButton, ...(activeView === 'lighting' ? activeTab : {}) }}
          onClick={() => setActiveView('lighting')}
        >
          Lighting Heatmap
        </button>
        <button 
          style={{ ...tabButton, ...(activeView === 'trends' ? activeTab : {}) }}
          onClick={() => setActiveView('trends')}
        >
          Trends
        </button>
      </div>

      {/* Charts */}
      {activeView === 'lighting' ? (
        <div style={{ marginBottom: '48px' }}>
          <LightingHeatMap data={data} />
        </div>
      ) : (
        <div style={chartsGrid}>
          <ProScoreTrend data={data} />
          <FocalLengthDistribution data={data} />
        </div>
      )}

      {/* Recommendations */}
      <div style={recommendationsSection}>
        <h3 style={sectionTitle}>🎯 Professional Recommendations</h3>
        <div style={recommendationsList}>
          <Recommendation 
            title="Optimal Key:fill Ratio" 
            score={92} 
            recommendation="Use 2.5:1 ratio for 15% higher pro scores"
          />
          <Recommendation 
            title="Best Time" 
            score={88} 
            recommendation="14:00-16:00 yields 22% better lighting balance"
          />
          <Recommendation 
            title="Focal Length" 
            score={95} 
            recommendation="85mm portrait lens = highest conversion"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const dashboardContainer: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
  color: '#e0e0e0',
  minHeight: '100vh',
  padding: '32px',
  fontFamily: '"Inter", -apple-system, sans-serif'
};

const dashboardHeader: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '48px'
};

const dashboardTitle: React.CSSProperties = {
  fontSize: '48px',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #667eea, #48bb78)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: 0
};

const dashboardSubtitle: React.CSSProperties = {
  fontSize: '20px',
  opacity: 0.8,
  marginTop: '8px'
};

const metricsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '24px',
  marginBottom: '48px'
};

const metricCard: React.CSSProperties = {
  background: 'rgba(26, 31, 58, 0.6)',
  padding: '24px',
  borderRadius: '16px',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(102, 126, 234, 0.2)'
};

const metricTitle: React.CSSProperties = {
  fontSize: '14px',
  opacity: 0.7,
  marginBottom: '8px'
};

const metricValue: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 800,
  marginBottom: '4px'
};

const metricTrend: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600
};

const tabContainer: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '32px',
  justifyContent: 'center'
};

const tabButton: React.CSSProperties = {
  padding: '12px 24px',
  background: 'rgba(42, 47, 74, 0.6)',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  borderRadius: '12px',
  color: '#e0e0e0',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'all 0.3s ease'
};

const activeTab: React.CSSProperties = {
  background: 'linear-gradient(135deg, #667eea, #48bb78)',
  borderColor: '#667eea',
  color: 'white'
};

const chartsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '32px',
  marginBottom: '48px'
};

const chartContainer: React.CSSProperties = {
  background: 'rgba(26, 31, 58, 0.6)',
  borderRadius: '20px',
  padding: '24px',
  border: '1px solid rgba(102, 126, 234, 0.2)'
};

const chartTitle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  marginBottom: '20px',
  color: '#667eea'
};

const recommendationsSection: React.CSSProperties = {
  background: 'rgba(26, 31, 58, 0.4)',
  borderRadius: '20px',
  padding: '32px',
  border: '1px solid rgba(102, 126, 234, 0.2)'
};

const sectionTitle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '24px',
  color: '#48bb78'
};

const recommendationsList: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px'
};

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.9)',
  color: 'white',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '14px'
};

export default ProLightAnalyticsDashboard;

