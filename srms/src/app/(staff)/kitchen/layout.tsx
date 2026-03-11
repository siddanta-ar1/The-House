import { ReactNode } from 'react'
import KitchenLayoutClient from '@/components/kitchen/KitchenLayoutClient'

export default function KitchenLayout({ children }: { children: ReactNode }) {
    return <KitchenLayoutClient>{children}</KitchenLayoutClient>
}
