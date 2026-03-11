import { create } from 'zustand'

type ConfirmStore = {
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    isDestructive: boolean
    resolve: ((value: boolean) => void) | null
    confirm: (params: {
        title: string
        message: string
        confirmText?: string
        cancelText?: string
        isDestructive?: boolean
    }) => Promise<boolean>
    handleConfirm: () => void
    handleCancel: () => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    resolve: null,

    confirm: ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false }) => {
        return new Promise<boolean>((resolve) => {
            set({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                isDestructive,
                resolve,
            })
        })
    },

    handleConfirm: () => {
        const { resolve } = get()
        if (resolve) resolve(true)
        set({ isOpen: false, resolve: null })
    },

    handleCancel: () => {
        const { resolve } = get()
        if (resolve) resolve(false)
        set({ isOpen: false, resolve: null })
    },
}))
