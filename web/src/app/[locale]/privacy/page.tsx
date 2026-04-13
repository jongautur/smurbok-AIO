import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function PrivacyPage() {
  const t = useTranslations('privacy')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('lastUpdated')}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('section1Title')}</h2>
          <p className="text-sm text-gray-600">{t('section1Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('section2Title')}</h2>
          <p className="text-sm text-gray-600">{t('section2Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('section3Title')}</h2>
          <p className="text-sm text-gray-600">{t('section3Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('section4Title')}</h2>
          <p className="text-sm text-gray-600">{t('section4Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">{t('section5Title')}</h2>
          <p className="text-sm text-gray-600">{t('section5Body')}</p>
        </section>

        <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
          {t('contact')}{' '}
          <a href="mailto:smurbok@smurbok.is" className="text-blue-600 hover:underline">
            smurbok@smurbok.is
          </a>
        </div>

        <Link href="../login" className="inline-block text-sm text-blue-600 hover:underline">
          ← {t('back')}
        </Link>
      </div>
    </div>
  )
}
