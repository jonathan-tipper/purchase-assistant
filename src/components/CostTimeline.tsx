
import React from "react";
import { PurchaseItem } from "@/types";
import { calculateMetrics, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { currencies } from "./CurrencySelector";

interface CostTimelineProps {
  item: PurchaseItem;
  currencyCode: string;
}

const CostTimeline = ({ item, currencyCode }: CostTimelineProps) => {
  const currencySymbol = currencies.find(c => c.code === currencyCode)?.symbol || "£";
  
  // Generate timeline data for the purchase
  const generateTimelineData = (item: PurchaseItem) => {
    const { price, depreciationRatePercent, lifespanYears } = item;
    const data = [];
    
    // Calculate yearly data points
    for (let year = 0; year <= lifespanYears; year++) {
      // Calculate value after depreciation
      const remainingValue = price * Math.pow(1 - depreciationRatePercent / 100, year);
      
      // Calculate metrics for this point in time
      const yearlyMetrics = calculateMetrics({
        ...item,
        lifespanYears: year === 0 ? 0.01 : year, // Avoid division by zero
      });
      
      data.push({
        year,
        remainingValue: parseFloat(remainingValue.toFixed(2)),
        costPerUse: parseFloat(yearlyMetrics.costPerUse.toFixed(2)),
        costPerHour: parseFloat(yearlyMetrics.costPerHour.toFixed(2)),
      });
    }
    
    return data;
  };

  const timelineData = generateTimelineData(item);

  return (
    <Card className="glass-card animate-scale-in">
      <CardHeader>
        <CardTitle className="text-xl">Cost Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          This chart shows how the cost per use and remaining value changes over the lifespan of your purchase.
        </p>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timelineData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                label={{ 
                  value: 'Years', 
                  position: 'insideBottomRight', 
                  offset: -5 
                }} 
              />
              <YAxis 
                label={{ 
                  value: `Value (${currencySymbol})`, 
                  angle: -90, 
                  position: 'insideLeft' 
                }} 
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value), currencyCode)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="remainingValue"
                name="Remaining Value"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="costPerUse"
                name="Cost Per Use"
                stroke="#82ca9d"
              />
              <Line
                type="monotone"
                dataKey="costPerHour"
                name="Cost Per Hour"
                stroke="#ffc658"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostTimeline;
