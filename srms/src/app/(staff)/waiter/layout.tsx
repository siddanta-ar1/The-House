import { ReactNode } from 'react'
import WaiterLayoutClient from '@/components/waiter/WaiterLayoutClient'

export default function WaiterLayout({ children }: { children: ReactNode }) {
    return <WaiterLayoutClient>{children}</WaiterLayoutClient>
}
