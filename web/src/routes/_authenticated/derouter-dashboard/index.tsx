/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { createFileRoute, redirect } from '@tanstack/react-router'

import { DerouterDashboard } from '@/features/derouter/derouter-dashboard'
import { SectionPageLayout } from '@/components/layout'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'
import { useTranslation } from 'react-i18next'

function DerouterDashboardPage() {
  const { t } = useTranslation()
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Derouter Dashboard')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <DerouterDashboard />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

export const Route = createFileRoute('/_authenticated/derouter-dashboard/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth.user || (auth.user.role ?? 0) < ROLE.DEROUTER_VIEWER) {
      throw redirect({ to: '/keys' })
    }
  },
  component: DerouterDashboardPage,
})
