'use client'

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Settings2, RotateCcw } from "lucide-react"

interface MatrixFilterToolbarProps {
    facilities: string[]
    selectedFacility: string
    onFacilityChange: (val: string) => void

    searchQuery: string
    onSearchChange: (val: string) => void

    showErrorsOnly: boolean
    onShowErrorsChange: (val: boolean) => void

    columns: { key: string; label: string }[]
    visibleColumns: Record<string, boolean>
    onToggleColumn: (key: string, checked: boolean) => void

    onReset: () => void
}

export function MatrixFilterToolbar({
    facilities,
    selectedFacility,
    onFacilityChange,
    searchQuery,
    onSearchChange,
    showErrorsOnly,
    onShowErrorsChange,
    columns,
    visibleColumns,
    onToggleColumn,
    onReset
}: MatrixFilterToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 p-2 bg-gray-50 border-b">
            {/* Facility Filter */}
            <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-gray-500">施設:</Label>
                <Select value={selectedFacility} onValueChange={onFacilityChange}>
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                        <SelectValue placeholder="施設を選択" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全施設</SelectItem>
                        {facilities.map((f) => (
                            <SelectItem key={f} value={f}>
                                {f}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Name Search */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="利用者名検索..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-[150px] h-8 text-xs bg-white"
                />
            </div>

            {/* Error Only Toggle */}
            <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
                <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border">
                    <Checkbox
                        id="show-errors"
                        checked={showErrorsOnly}
                        onCheckedChange={(checked) => onShowErrorsChange(!!checked)}
                    />
                    <Label
                        htmlFor="show-errors"
                        className="text-xs font-bold cursor-pointer text-red-600"
                    >
                        NG/不一致のみ表示
                    </Label>
                </div>
            </div>

            {/* Column Visibility */}
            <div className="ml-auto flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <Settings2 className="w-3 h-3" />
                            表示項目
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                        <div className="grid gap-2">
                            <h4 className="font-medium text-xs border-b pb-1">表示列の選択</h4>
                            {columns.map((col) => (
                                <div key={col.key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`col-${col.key}`}
                                        checked={visibleColumns[col.key]}
                                        onCheckedChange={(checked) => onToggleColumn(col.key, !!checked)}
                                    />
                                    <Label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer">
                                        {col.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onReset}
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                    title="条件をリセット"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
