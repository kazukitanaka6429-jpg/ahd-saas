
import {
    LayoutDashboard,
    Building2,
    Users,
    UserCircle,
    FileSpreadsheet,
    BarChart3,
    Stethoscope,
    ClipboardCheck,
    GraduationCap,
    Database,
} from 'lucide-react'

// メニュー構造の定義
export type SidebarItem = {
    title: string;
    href?: string;
    icon: any;
    adminOnly?: boolean;
    children?: SidebarItem[]; // サブメニュー
}

export const sidebarItems: SidebarItem[] = [
    {
        title: 'ダッシュボード',
        href: '/',
        icon: LayoutDashboard,
    },
    {
        title: '業務日誌',
        href: '/daily-reports',
        icon: FileSpreadsheet,
    },
    {
        title: '医療連携IV',
        href: '/medical-cooperation',
        icon: Stethoscope,
    },
    {
        title: '医療連携Ⅴ',
        href: '/medical-v',
        icon: Stethoscope,
    },
    {
        title: '一覧確認',
        href: '/hq/daily',
        icon: ClipboardCheck,
    },
    {
        title: '人員配置チェック',
        href: '/audit/personnel',
        icon: Users,
    },
    {
        title: 'ログ分析',
        href: '/analysis',
        icon: BarChart3,
        adminOnly: true,
    },
    // マスタ管理グループ
    {
        title: 'マスタ',
        icon: Database,
        href: undefined, // グループヘッダーなのでリンクなし
        children: [
            {
                title: '施設マスタ',
                href: '/admin/facilities',
                icon: Building2,
                adminOnly: true,
            },
            {
                title: '資格マスタ',
                href: '/admin/qualifications',
                icon: GraduationCap,
                adminOnly: true,
            },
            {
                title: '職員マスタ',
                href: '/staffs',
                icon: Users,
            },
            {
                title: '利用者マスタ',
                href: '/residents',
                icon: UserCircle,
            },
        ]
    }
]
