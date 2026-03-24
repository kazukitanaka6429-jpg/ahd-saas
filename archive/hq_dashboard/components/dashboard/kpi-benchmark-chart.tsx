'use client'

import { FacilityKPI } from '@/lib/analytics/kpi_calculator'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface KpiBenchmarkChartProps {
    data: FacilityKPI[]
}

export function KpiBenchmarkChart({ data }: KpiBenchmarkChartProps) {
    // Transform data for charts if needed
    // Recharts can consume FacilityKPI[] directly if keys match

    // Sort logic? Overtime desc?
    const overtimeData = [...data].sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
    const vacancyData = [...data].sort((a, b) => b.vacancyRate - a.vacancyRate)
    const addonData = [...data].sort((a, b) => b.missedAddonRate - a.missedAddonRate)

    return (
        <Card className="h-[400px] flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle>施設間ベンチマーク比較</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <Tabs defaultValue="overtime" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="overtime">残業時間 (Hours)</TabsTrigger>
                        <TabsTrigger value="vacancy">欠員率 (%)</TabsTrigger>
                        <TabsTrigger value="addon">加算未取得率 (%)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overtime" className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={overtimeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                                <XAxis type="number" />
                                <YAxis dataKey="facilityName" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="totalOvertimeHours" name="月間残業時間" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="vacancy" className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={vacancyData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis dataKey="facilityName" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="vacancyRate" name="欠員率 (%)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="addon" className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={addonData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis dataKey="facilityName" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="missedAddonRate" name="加算未取得率 (%)" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
