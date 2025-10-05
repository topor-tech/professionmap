import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ProfessionMap - Карьерные возможности для молодых специалистов" },
    { name: "description", content: "Ресурс для молодых специалистов, выпускников и студентов вузов. Свежие вакансии, карьерные рекомендации и онлайн-курсы." },
  ];
}

export default function Home() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4" style={{ backgroundColor: '#030e18', color: 'var(--color-text-primary)' }}>
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0 max-w-4xl mx-auto px-4">
        <header className="flex flex-col items-center gap-9">
          <div className="flex items-center gap-8">
            <img 
              src="/big-logo.png" 
              alt="ProfessionMap Logo" 
              className="h-32 w-auto"
            />
            <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Добро пожаловать на к нам!
            </h1>
          </div>
        </header>
        
        <div className="w-full space-y-8">
          <div 
            className="rounded-3xl p-8 shadow-lg"
            style={{ 
              backgroundColor: 'var(--color-surface)', 
              border: '1px solid var(--color-border)' 
            }}
          >
            <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Наш проект находится в активной стадии разработки, и мы готовимся представить вам ресурс для молодых специалистов, выпускников и студентов вузов. Уже совсем скоро здесь появятся:
            </p>
            
            <ul className="space-y-4" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex items-start gap-3">
                <div 
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                ></div>
                <span>Свежие вакансии от крупных и перспективных компаний</span>
              </li>
              <li className="flex items-start gap-3">
                <div 
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-success)' }}
                ></div>
                <span>Полезные инструкции и рекомендации по построению успешной карьеры</span>
              </li>
              <li className="flex items-start gap-3">
                <div 
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-warning)' }}
                ></div>
                <span>Ссылки на онлайн-курсы и тренинги для профессионального роста</span>
              </li>
            </ul>
            
            <a 
              href="https://t.me/professionmap"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 p-4 rounded-xl block hover:opacity-90 transition-opacity"
              style={{ 
                backgroundColor: 'var(--color-accent)', 
                border: '1px solid var(--color-accent-hover)' 
              }}
            >
              <p className="font-medium text-center" style={{ color: 'white' }}>
                Следите за обновлениями в Telegram!
              </p>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
