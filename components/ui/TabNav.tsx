'use client'

export interface TabItem {
  id: string
  label: string
  icon?: string
}

interface TabNavProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  /** 額外 className */
  className?: string
}

export function TabNav({ tabs, activeTab, onChange, className = '' }: TabNavProps) {
  return (
    <nav className={`flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-4 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.icon ? `${tab.icon} ` : ''}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
