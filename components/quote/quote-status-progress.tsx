import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Clock, Send, ThumbsUp, Ban, Calendar } from 'lucide-react'

interface QuoteStatusProgressProps {
  status: string
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function QuoteStatusProgress({ status, showProgress = true, size = 'md' }: QuoteStatusProgressProps) {
  const statusSteps = [
    { key: 'pending', label: 'Wacht op Beoordeling', icon: Clock },
    { key: 'needs_attention', label: 'Aandacht Vereist', icon: AlertCircle },
    { key: 'ready_for_pricing', label: 'Klaar voor Pricing', icon: CheckCircle },
    { key: 'sent', label: 'Verzonden', icon: Send },
    { key: 'accepted', label: 'Geaccepteerd', icon: ThumbsUp },
    { key: 'done', label: 'Voltooid', icon: CheckCircle }
  ]

  const getCurrentStep = () => {
    const index = statusSteps.findIndex(step => step.key === status)
    return Math.max(0, index)
  }

  const getProgress = () => {
    if (status === 'declined' || status === 'expired') return 0
    if (status === 'needs_attention') return 15 // Special case - back to step 1

    const currentStep = getCurrentStep()
    const totalSteps = statusSteps.length
    return ((currentStep + 1) / totalSteps) * 100
  }

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'needs_attention':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'ready_for_pricing':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'sent':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'accepted':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'done':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'declined':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'expired':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Wacht op Beoordeling'
      case 'needs_attention':
        return 'Aandacht Vereist'
      case 'ready_for_pricing':
        return 'Klaar voor Pricing'
      case 'sent':
        return 'Verzonden naar Klant'
      case 'accepted':
        return 'Geaccepteerd door Klant'
      case 'done':
        return 'Voltooid'
      case 'declined':
        return 'Afgewezen'
      case 'expired':
        return 'Verlopen'
      default:
        return status
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return Clock
      case 'needs_attention':
        return AlertCircle
      case 'ready_for_pricing':
        return CheckCircle
      case 'sent':
        return Send
      case 'accepted':
        return ThumbsUp
      case 'done':
        return CheckCircle
      case 'declined':
        return Ban
      case 'expired':
        return Calendar
      default:
        return Clock
    }
  }

  const StatusIcon = getStatusIcon()
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

  if (!showProgress) {
    return (
      <Badge className={`${getStatusColor()} ${textSize}`}>
        <StatusIcon className={`${iconSize} mr-1`} />
        {getStatusText()}
      </Badge>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge className={`${getStatusColor()} ${textSize}`}>
          <StatusIcon className={`${iconSize} mr-1`} />
          {getStatusText()}
        </Badge>
        <span className="text-xs text-gray-500">
          {Math.round(getProgress())}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={getProgress()} className="h-2" />

        {/* Progress Steps */}
        <div className="flex justify-between text-xs text-gray-500">
          {statusSteps.map((step, index) => {
            const StepIcon = step.icon
            const currentStep = getCurrentStep()
            const isCompleted = index <= currentStep && status !== 'needs_attention'
            const isCurrent = index === currentStep
            const isNeedsAttention = status === 'needs_attention' && step.key === 'needs_attention'

            return (
              <div
                key={step.key}
                className={`flex flex-col items-center space-y-1 ${
                  isCompleted || isCurrent || isNeedsAttention
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                <StepIcon className="h-3 w-3" />
                <span className="text-xs max-w-12 text-center leading-tight">
                  {step.label.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Special status messages */}
      {status === 'declined' && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Deze offerte is afgewezen door de klant
        </div>
      )}

      {status === 'expired' && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          Deze offerte is verlopen (14 dagen geldigheid)
        </div>
      )}
    </div>
  )
}