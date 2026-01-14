'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DocumentAlert } from '@/lib/document-types'
import { markAsRenewed } from '@/app/actions/resident-documents'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FileWarning, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

interface DocumentAlertsWidgetProps {
    alerts: DocumentAlert[]
}

export function DocumentAlertsWidget({ alerts: initialAlerts }: DocumentAlertsWidgetProps) {
    const [alerts, setAlerts] = useState(initialAlerts)
    const [isPending, startTransition] = useTransition()

    if (alerts.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileWarning className="h-5 w-5" />
                        書類更新アラート
                    </CardTitle>
                    <CardDescription>有効期限が近い書類はありません</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mr-2 text-green-500" />
                        <span>すべての書類は最新です</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const handleMarkAsRenewed = (id: string) => {
        // Optimistic update
        setAlerts(prev => prev.filter(a => a.id !== id))

        startTransition(async () => {
            const result = await markAsRenewed(id)
            if (result.error) {
                // Revert on error
                setAlerts(initialAlerts)
                toast.error('更新に失敗しました', { description: result.error })
            } else {
                toast.success('更新完了としてマークしました')
            }
        })
    }

    const getAlertIcon = (level: string) => {
        switch (level) {
            case 'critical':
                return <AlertTriangle className="h-4 w-4 text-red-500" />
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-orange-500" />
            default:
                return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    const getRowClass = (level: string) => {
        switch (level) {
            case 'critical':
                return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500'
            case 'warning':
                return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500'
            default:
                return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500'
        }
    }

    const getBadgeVariant = (level: string): "default" | "destructive" | "secondary" | "outline" => {
        switch (level) {
            case 'critical':
                return 'destructive'
            case 'warning':
                return 'default'
            default:
                return 'secondary'
        }
    }

    const criticalCount = alerts.filter(a => a.alertLevel === 'critical').length
    const warningCount = alerts.filter(a => a.alertLevel === 'warning').length

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5" />
                    書類更新アラート
                    {criticalCount > 0 && (
                        <Badge variant="destructive">{criticalCount}件 至急</Badge>
                    )}
                    {warningCount > 0 && (
                        <Badge variant="default" className="bg-orange-500">{warningCount}件 要対応</Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    有効期限が近い、または過ぎている書類があります
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-center gap-4 p-3 rounded-md transition-colors ${getRowClass(alert.alertLevel)}`}
                        >
                            <Checkbox
                                id={`alert-${alert.id}`}
                                checked={false}
                                disabled={isPending}
                                onCheckedChange={() => handleMarkAsRenewed(alert.id)}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {getAlertIcon(alert.alertLevel)}
                                    <span className="font-medium truncate">{alert.residentName}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {alert.facilityName}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <span>{alert.documentTypeLabel}</span>
                                    <span>•</span>
                                    <span>
                                        期限: {format(new Date(alert.validTo), 'yyyy/M/d', { locale: ja })}
                                    </span>
                                    <span>•</span>
                                    <span className={alert.daysUntilExpiry <= 0 ? 'text-red-600 font-semibold' : ''}>
                                        {alert.daysUntilExpiry <= 0
                                            ? `${Math.abs(alert.daysUntilExpiry)}日超過`
                                            : `残り${alert.daysUntilExpiry}日`
                                        }
                                    </span>
                                </div>
                            </div>
                            <Badge variant={getBadgeVariant(alert.alertLevel)} className="shrink-0">
                                {alert.alertLevel === 'critical' ? '至急' : alert.alertLevel === 'warning' ? '要対応' : '準備'}
                            </Badge>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    ✓ チェックを入れると更新完了としてマークされ、リストから消えます
                </p>
            </CardContent>
        </Card>
    )
}
