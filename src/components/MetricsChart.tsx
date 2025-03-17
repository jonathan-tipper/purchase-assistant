
import React from "react";
import { PurchaseItem, PurchaseMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/utils/calculations";

interface MetricsChartProps {
  item: PurchaseItem;
  metrics: PurchaseMetrics;
  className?: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ item, metrics, className = "" }) => {
  // Prepare cost breakdown data for bar chart
  const costData = [
    { name: "Per Use", value: metrics.costPerUse },
    { name: "Per Hour", value: metrics.costPerHour },
    { name: "Per Week", value: metrics.costPerWeek },
    { name: "Per Month", value: metrics.costPerMonth },
  ];

  // Prepare value retention data for pie chart
  const retentionData = [
    { name: "Value Lost", value: 100 - metrics.valueRetainedPercent },
    { name: "Value Retained", value: metrics.valueRetainedPercent },
  ];

  const COLORS = ["#3B82F6", "#93C5FD", "#BFDBFE", "#DBEAFE"];
  const PIE_COLORS = ["#EF4444", "#3B82F6"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-sm p-2 border border-border rounded-md shadow-sm">
          <p className="text-sm font-medium">{`${label}`}</p>
          <p className="text-sm">{`${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`glass-card animate-scale-in ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl">Visual Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h3 className="font-medium text-base mb-4">Cost Breakdown</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`} 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-base mb-4">Value Retention</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={retentionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1500}
                    animationBegin={300}
                  >
                    {retentionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index % PIE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsChart;
