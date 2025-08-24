"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface RevenueChartProps {
  data: {
    month: string
    current: number
    previous: number
  }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap">
        <h3 className="text-base font-medium">Revenue</h3>
        <div className="flex items-center text-xs flex-wrap mt-1 sm:mt-0">
          <div className="flex items-center mr-4 mb-1 sm:mb-0">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            <span>Current Week: $58,211</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
            <span>Previous Week: $68,768</span>
          </div>
        </div>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}M`}
              domain={[0, "dataMax + 5"]}
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

