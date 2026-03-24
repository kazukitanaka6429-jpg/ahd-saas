'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { ResidentMatrixData, HqMatrixRow } from '@/types'
import { upsertDailyRecordsBulk } from '@/app/(dashboard)/daily-reports/actions'
import { upsertAndLogHqRecord } from '@/app/actions/hq/upsert-and-log'
import { HqStayManagement } from '@/components/hq/hq-stay-management'
import { MatrixFilterToolbar } from '@/components/hq/matrix-filter-toolbar'
import { cn } from '@/lib/utils'
import { ResidentStayData } from '@/types'
import { Button } from '@/components/ui/button'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FindingSheet } from '@/components/features/daily-report/finding-sheet'
import { getFindingComments } from '@/app/actions/findings'

interface HqCheckMatrixProps {
    data: ResidentMatrixData[]
    stayData: ResidentStayData[]
    year: number
    month: number
}

// Reusable Matrix Table Component
const MatrixTable = ({
    data,
    year,
    month,
    rowKeys,
    days,
    isEditing,
    onToggle,
    rowColors,
    onResidentContextMenu,
    findingsResidentIds
}: {
    data: ResidentMatrixData[],
    year: number,
    month: number,
    rowKeys: string[],
    days: number[],
    isEditing: boolean,
    onToggle: (residentId: string, rowKey: string, day: number, current: boolean) => void,
    rowColors: Record<string, string>,
    onResidentContextMenu?: (e: React.MouseEvent, residentId: string, residentName: string) => void,
    findingsResidentIds?: Set<string>
}) => {
    return (
        <div className="overflow-auto flex-1 relative border border-gray-200 rounded-2xl bg-white shadow-sm">
            <table className="border-collapse w-full text-xs min-w-[max-content]">
                <thead className="bg-[#Fdfbf9] text-gray-700 sticky top-0 z-20 shadow-sm font-bold">
                    <tr>
                        <th className="border border-gray-200 p-2 sticky left-0 z-30 bg-gray-100 w-[120px] min-w-[120px]">施設名</th>
                        <th className="border border-gray-200 p-2 sticky left-[120px] z-30 bg-gray-100 w-[120px] min-w-[120px]">利用者名</th>
                        <th className="border border-gray-200 p-2 sticky left-[240px] z-30 bg-gray-100 w-[100px] min-w-[100px]">項目</th>

                        {days.map(d => (
                            <th key={d} className="border border-gray-200 bg-[#Fdfbf9] p-1 w-[35px] min-w-[35px] text-center">
                                {d}
                            </th>
                        ))}

                        <th className="border border-gray-200 p-2 sticky right-[120px] z-30 bg-gray-100 w-[60px] text-center">SaaS</th>
                        <th className="border border-gray-200 p-2 sticky right-[60px] z-30 bg-gray-100 w-[60px] text-center">CSV</th>
                        <th className="border border-gray-200 p-2 sticky right-0 z-30 bg-gray-100 w-[60px] text-center">判定</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((residentItem) => {
                        const { resident, rows } = residentItem

                        // Filter rows for this tab
                        const visibleRows = rows.filter(r => rowKeys.includes(r.key))
                        if (visibleRows.length === 0) return null

                        return visibleRows.map((row, rowIndex) => (
                            <tr key={`${resident.id}-${row.key}`} className={cn("group transition-colors", rowColors[row.key] || 'bg-white hover:bg-gray-50')}>
                                {/* Facility Name - Only for first row of this resident */}
                                {rowIndex === 0 && (
                                    <td rowSpan={visibleRows.length} className="border border-gray-200 p-2 sticky left-0 z-10 bg-white font-medium align-top">
                                        <div className="writing-mode-vertical-rl h-full flex items-center justify-center text-gray-700 font-bold whitespace-nowrap">
                                            {(resident as any).facilities?.name || "施設不明"}
                                        </div>
                                    </td>
                                )}

                                {/* Resident Name - Only for first row */}
                                {rowIndex === 0 && (
                                    <td
                                        rowSpan={visibleRows.length}
                                        className="border border-gray-200 p-2 sticky left-[120px] z-10 bg-white font-bold align-top border-b-gray-400 cursor-pointer hover:bg-orange-50/50 transition-colors relative"
                                        onContextMenu={(e) => {
                                            e.preventDefault()
                                            onResidentContextMenu?.(e, resident.id, resident.name)
                                        }}
                                    >
                                        <div>{resident.name}</div>
                                        <div className="text-gray-500 text-[10px] mt-1">
                                            入居: {resident.start_date}<br />
                                            {resident.status !== 'in_facility' && <span className="text-red-500">({resident.status})</span>}
                                        </div>
                                        {/* Red indicator for findings */}
                                        {findingsResidentIds?.has(resident.id) && (
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />
                                        )}
                                    </td>
                                )}

                                {/* Item Label */}
                                <td className={cn(
                                    "border border-gray-200 p-2 sticky left-[240px] z-10 font-bold text-center border-r-2 border-r-gray-300",
                                    rowColors[row.key] || 'bg-gray-50'
                                )}>
                                    {row.label}
                                </td>

                                {/* Days */}
                                {days.map((day, dIndex) => {
                                    const isActive = row.dailyValues[dIndex]
                                    return (
                                        <td
                                            key={dIndex}
                                            className={cn(
                                                "border border-gray-200 p-0 text-center relative transition-opacity",
                                                isEditing ? "cursor-pointer hover:brightness-95 hover:bg-white" : "cursor-not-allowed opacity-80"
                                            )}
                                            onClick={() => isEditing && onToggle(resident.id, row.key, day, isActive)}
                                        >
                                            {isActive && (
                                                <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                                                    <Check className={cn("w-4 h-4", !isEditing && "text-gray-400")} />
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}

                                {/* Totals & Judge */}
                                <td className="border border-gray-200 p-2 sticky right-[120px] z-10 bg-white text-center font-bold border-l-2 border-l-gray-300 text-gray-800">
                                    {row.saasCount}
                                </td>
                                <td className="border border-gray-200 p-2 sticky right-[60px] z-10 bg-white text-center font-medium text-gray-600">
                                    {row.csvCount}
                                </td>
                                <td className={cn(
                                    "border border-gray-200 p-2 sticky right-0 z-10 text-center font-bold text-white",
                                    row.status === 'match' ? 'bg-orange-400' : 'bg-red-500 animate-pulse'
                                )}>
                                    {row.status === 'match' ? 'OK' : 'NG'}
                                </td>
                            </tr>
                        ))
                    })}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={31 + 6} className="p-8 text-center text-gray-500">
                                データがありません
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

export function HqCheckMatrix({ data, stayData, year, month }: HqCheckMatrixProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)

    // Determine active tab from URL or default
    const currentTab = searchParams.get('tab') || 'daily'

    const [optimisticData, setOptimisticData] = useState(data)

    useEffect(() => {
        setOptimisticData(data)
    }, [data])

    // Finding State for resident comments
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        residentId: string | null
        residentName: string
    }>({ isOpen: false, residentId: null, residentName: '' })

    // Track which residents have findings
    const [findingsResidentIds, setFindingsResidentIds] = useState<Set<string>>(new Set())

    // Handle resident name right-click
    const handleResidentContextMenu = useCallback((e: React.MouseEvent, residentId: string, residentName: string) => {
        setFindingState({
            isOpen: true,
            residentId,
            residentName
        })
    }, [])

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('tab', value)
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    // --- Filtering State ---
    const [selectedFacility, setSelectedFacility] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showErrorsOnly, setShowErrorsOnly] = useState(false)

    // Column Visibility State
    const dailyKeys = ['meal_breakfast', 'meal_lunch', 'meal_dinner', 'daytime_activity', 'is_gh_night']
    const medicalKeys = ['medical_iv_1', 'medical_iv_2', 'medical_iv_3']
    const allKeys = [...dailyKeys, ...medicalKeys]

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
        allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
    )

    const handleToggleColumn = (key: string, checked: boolean) => {
        setVisibleColumns(prev => ({ ...prev, [key]: checked }))
    }

    const handleResetFilters = () => {
        setSelectedFacility('all')
        setSearchQuery('')
        setShowErrorsOnly(false)
        setVisibleColumns(allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    }

    // --- Derived Data for Toolbar ---
    const facilities = Array.from(new Set(data.map(d => (d.resident as any).facilities?.name || '不明')))

    const currentTabColumns = currentTab === 'medical'
        ? medicalKeys.map(k => ({ key: k, label: getLabelForKey(k) }))
        : dailyKeys.map(k => ({ key: k, label: getLabelForKey(k) }))

    // Helper for labels (simplified)
    function getLabelForKey(key: string) {
        if (key === 'meal_breakfast') return '朝食'
        if (key === 'meal_lunch') return '昼食'
        if (key === 'meal_dinner') return '夕食'
        if (key === 'daytime_activity') return '日中活動'
        if (key === 'is_gh_night') return '夜勤加配'
        if (key === 'medical_iv_1') return '体制加算 Ⅳ1'
        if (key === 'medical_iv_2') return '体制加算 Ⅳ2'
        if (key === 'medical_iv_3') return '体制加算 Ⅳ3'
        return key
    }

    // --- Filtering Logic ---
    const getFilteredData = (sourceData: ResidentMatrixData[]) => {
        return sourceData.filter(item => {
            const facilityName = (item.resident as any).facilities?.name || '不明'
            const residentName = item.resident.name

            // 1. Facility Filter
            if (selectedFacility !== 'all' && facilityName !== selectedFacility) return false

            // 2. Search Filter
            if (searchQuery && !residentName.includes(searchQuery)) return false

            // 3. Error Filter
            if (showErrorsOnly) {
                // If ANY row in this resident has mismatch, keep resident? 
                // BUT we also want to hide non-error rows? 
                // Let's filter visible rows inside map() as well if needed?
                // Requirement: "Show only residents with errors"
                const hasError = item.rows.some(r => r.status === 'mismatch')
                if (!hasError) return false
            }

            return true
        }).map(item => {
            // Apply filtering to rows if showing errors only? 
            // Usually context is "Show only mismatched rows" or just "Show residents with mismatch".
            // Let's filter visible rows by `visibleColumns` here first.

            // Note: visibleColumns filtering is handled by `rowKeys` prop passed to table.
            // But if `showErrorsOnly` is on, should we hide 'match' rows?
            // "Show Errors Only" implies focusing on errors.
            // Let's hide matched rows if showErrorsOnly is true.
            if (showErrorsOnly) {
                return {
                    ...item,
                    rows: item.rows.filter(r => r.status === 'mismatch')
                }
            }
            return item
        })
    }

    const filteredData = getFilteredData(optimisticData)
    // Also filter stayData? 
    // Usually logic for Stay tab is different but same filters (Facility/Name) should apply.
    // Errors for Stay? Stay management usually doesn't have SaaS/CSV compare yet.

    // Filter Stay Data
    const filteredStayData = stayData.filter(item => {
        const facilityName = item.facilityName
        const residentName = item.residentName
        if (selectedFacility !== 'all' && facilityName !== selectedFacility) return false
        if (searchQuery && !residentName.includes(searchQuery)) return false
        return true
    })

    // Filter keys for current tab
    const activeRowKeys = currentTab === 'medical' ? medicalKeys : dailyKeys
    const visibleRowKeys = activeRowKeys.filter(k => visibleColumns[k])


    const daysInMonth = new Date(year, month, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    const handleToggle = async (residentId: string, rowKey: string, day: number, currentValue: boolean) => {
        if (!isEditing) return

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const newValue = !currentValue

        // 1. Optimistic Update
        setOptimisticData(prev => prev.map(resData => {
            if (resData.resident.id !== residentId) return resData

            return {
                ...resData,
                rows: resData.rows.map(row => {
                    if (row.key === rowKey) {
                        const newValues = [...row.dailyValues]
                        newValues[day - 1] = newValue
                        return { ...row, dailyValues: newValues }
                    }
                    if (rowKey === 'is_gh_night' && row.key === 'is_gh_stay' as any) {
                        // night shift logic mirror
                    }
                    return row
                })
            }
        }))

        // 2. Server Action

        // Prepare record payload
        const record: any = {
            resident_id: residentId,
            date: dateStr,
            data: {},
        }

        if (rowKey === 'is_gh_night') {
            record.data['is_gh_night'] = newValue
            record.data['is_gh_stay'] = newValue
        } else if (rowKey === 'daytime_activity') {
            record.data['daytime_activity'] = newValue ? 'あり' : ''
        } else if (rowKey.startsWith('medical_iv_')) {
            // CRITICAL: Must be in data object for server handler to detect
            record.data[rowKey] = newValue
        } else {
            record.data[rowKey] = newValue
        }

        startTransition(async () => {
            try {
                const result = await upsertAndLogHqRecord([record], {
                    operationType: 'update',
                    targetDate: dateStr,
                    residentId: residentId,
                    description: `HQ Check: Changed ${rowKey} to ${newValue} for resident ${residentId}`
                })

                if (result.error) {
                    toast.error('保存に失敗しました', { description: result.error })
                    // Revert optimistic update
                    setOptimisticData(data)
                }
            } catch (e) {
                toast.error('通信エラーが発生しました')
                setOptimisticData(data)
            }
        })
    }

    // Colors
    const rowColors: Record<string, string> = {
        'meal_breakfast': 'bg-blue-50 hover:bg-blue-100',
        'meal_lunch': 'bg-orange-50 hover:bg-orange-100',
        'meal_dinner': 'bg-red-50 hover:bg-red-100',
        'daytime_activity': 'bg-green-50 hover:bg-green-100',
        'is_gh_night': 'bg-purple-50 hover:bg-purple-100',
        'medical_iv_1': 'bg-blue-50 hover:bg-blue-100',
        'medical_iv_2': 'bg-orange-50 hover:bg-orange-100',
        'medical_iv_3': 'bg-red-50 hover:bg-red-100',
    }

    return (
        <div className="relative w-full bg-white flex flex-col min-h-[500px] border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-0 border-b border-gray-200 bg-[#Fdfbf9] flex flex-col shrink-0">
                <MatrixFilterToolbar
                    facilities={facilities}
                    selectedFacility={selectedFacility}
                    onFacilityChange={setSelectedFacility}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    showErrorsOnly={showErrorsOnly}
                    onShowErrorsChange={setShowErrorsOnly}
                    columns={currentTabColumns}
                    visibleColumns={visibleColumns}
                    onToggleColumn={handleToggleColumn}
                    onReset={handleResetFilters}
                />
                <div className="p-3 flex justify-between items-center bg-[#Fdfbf9] border-t border-gray-200/50">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-700">修正操作:</span>
                        <Button
                            size="sm"
                            variant={isEditing ? "destructive" : "outline"}
                            onClick={() => setIsEditing(!isEditing)}
                            className={cn("h-8 text-xs font-bold rounded-xl", isEditing && "animate-pulse")}
                        >
                            {isEditing ? '修正モード終了 (Save)' : '🛠️ 修正モードに入る'}
                        </Button>
                        {isEditing && (
                            <span className="text-xs text-red-500 font-bold bg-white px-2 py-1 border border-red-200 rounded-lg shadow-sm animate-in fade-in">
                                ⚠️ クリックして修正可
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="px-5 py-3 bg-white border-b border-gray-200">
                    <TabsList className="bg-[#F5EBE1] p-1 rounded-xl">
                        <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-900 data-[state=active]:font-bold transition-all px-4 py-1.5">業務日誌</TabsTrigger>
                        <TabsTrigger value="medical" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-900 data-[state=active]:font-bold transition-all px-4 py-1.5">医療連携</TabsTrigger>
                        <TabsTrigger value="stay" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-900 data-[state=active]:font-bold transition-all px-4 py-1.5">入院・外泊</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="daily" className="flex-1 overflow-auto p-0 m-0 border-none data-[state=active]:flex flex-col h-full">
                    <MatrixTable
                        data={filteredData}
                        year={year}
                        month={month}
                        rowKeys={visibleRowKeys}
                        days={days}
                        isEditing={isEditing}
                        onToggle={handleToggle}
                        rowColors={rowColors}
                        onResidentContextMenu={handleResidentContextMenu}
                        findingsResidentIds={findingsResidentIds}
                    />
                </TabsContent>

                <TabsContent value="medical" className="flex-1 overflow-auto p-0 m-0 border-none data-[state=active]:flex flex-col h-full">
                    <MatrixTable
                        data={filteredData}
                        year={year}
                        month={month}
                        rowKeys={visibleRowKeys}
                        days={days}
                        isEditing={isEditing}
                        onToggle={handleToggle}
                        rowColors={rowColors}
                        onResidentContextMenu={handleResidentContextMenu}
                        findingsResidentIds={findingsResidentIds}
                    />
                </TabsContent>

                <TabsContent value="stay" className="flex-1 overflow-auto p-0 m-0 border-none data-[state=active]:flex flex-col h-full">
                    <HqStayManagement data={filteredStayData} />
                </TabsContent>
            </Tabs>

            {isPending && (
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-white/90 px-3 py-1 rounded shadow-md text-xs font-bold text-green-700 animate-in fade-in slide-in-from-top-2 z-50">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    保存中...
                </div>
            )}

            {/* Finding Sheet for resident comments */}
            <FindingSheet
                isOpen={findingState.isOpen}
                onClose={() => {
                    // Update red indicator after closing
                    if (findingState.residentId) {
                        getFindingComments(findingState.residentId, 'hq_memo', 'resident').then((comments) => {
                            const hasUnresolved = comments.some((c: any) => !c.is_resolved)
                            setFindingsResidentIds(prev => {
                                const newSet = new Set(prev)
                                if (hasUnresolved) {
                                    newSet.add(findingState.residentId!)
                                } else {
                                    newSet.delete(findingState.residentId!)
                                }
                                return newSet
                            })
                        })
                    }
                    setFindingState(prev => ({ ...prev, isOpen: false }))
                }}
                recordId={findingState.residentId}
                jsonPath="hq_memo"
                label={`本社メモ - ${findingState.residentName}`}
                recordType="resident"
            />
        </div>
    )
}
