-- Blog sources table — knowledge base for grounded AI generation (NotebookLM-style)
-- Sources are curated documents about Paraty used to ground Gemini generation
CREATE TABLE IF NOT EXISTS blog_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,           -- Full text of the source document
    summary TEXT,                    -- Short summary (auto-generated or manual)
    category TEXT NOT NULL DEFAULT 'geral'
        CHECK (category IN ('turismo', 'gastronomia', 'historia', 'eventos', 'dicas', 'noticias', 'geral')),
    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'url', 'pdf_extract', 'official_doc')),
    source_url TEXT,                 -- Original URL if sourced from web
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,  -- Inactive sources are excluded from grounding
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for category filtering (most common lookup)
CREATE INDEX IF NOT EXISTS idx_blog_sources_category ON blog_sources(category, is_active);
-- Index for tag search
CREATE INDEX IF NOT EXISTS idx_blog_sources_tags ON blog_sources USING GIN(tags);

-- Enable RLS
ALTER TABLE blog_sources ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write sources
CREATE POLICY "blog_sources_admin_all" ON blog_sources
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Service role (Edge Functions) can read sources for grounding
CREATE POLICY "blog_sources_service_read" ON blog_sources
    FOR SELECT USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_sources_updated_at
    BEFORE UPDATE ON blog_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_sources_updated_at();

-- ── Seed: initial knowledge base about Paraty ──
INSERT INTO blog_sources (title, category, source_type, tags, content) VALUES

('Centro Histórico de Paraty — Patrimônio UNESCO', 'historia', 'official_doc',
 ARRAY['centro histórico', 'patrimônio', 'unesco', 'arquitetura', 'colonial'],
 'O centro histórico de Paraty foi tombado como Patrimônio Cultural da Humanidade pela UNESCO em 2019 (junto com a Ilha Grande), como parte da inscrição "Paraty e Ilha Grande — Cultura e Biodiversidade". As ruas são de pé-de-moleque (pedras irregulares) e foram projetadas para que a maré as lavasse naturalmente. O centro histórico é fechado para veículos motorizados durante o dia. Os principais pontos são: Igreja de Santa Rita (1722) — mais antiga de Paraty; Igreja Nossa Senhora do Rosário e São Benedito (séc. XVIII); Igreja Nossa Senhora das Dores; Forte Defensor Perpétuo (1703); Casa da Cultura de Paraty; Teatro Espaço (tradicional de bonecos). A arquitetura colonial portuguesa é preservada e os imóveis são pintados de branco com detalhes coloridos. A cidade ficou isolada por séculos, o que ajudou a preservar seu centro histórico intacto.'),

('Praias e Ilhas de Paraty', 'turismo', 'official_doc',
 ARRAY['praias', 'ilhas', 'passeio de barco', 'snorkeling', 'mergulho'],
 'A região de Paraty possui mais de 65 ilhas e 300 praias. As mais acessíveis por barco ou escuna saindo do cais: Ilha do Araújo (próxima, boa para famílias), Praia da Lula (águas cristalinas), Praia do Sono (belíssima, acessível por trilha ou barco — 11 km da cidade, famosa pela beleza selvagem), Praia da Juatinga (área de proteção ambiental), Ilha do Pelado (snorkeling excelente), Praia Vermelha. Na zona rural: Praia de Paraty-Mirim (a 17 km, possui igrejinha colonial do século XVIII na beira da praia), Praia da Trindade (a 25 km, vila de pescadores com piscinas naturais — Cachadaço e Cepilho). Os passeios de barco partem do Porto de Paraty diariamente (preço médio R$80-150 por pessoa em 2026). Melhor época para passeios: meses secos (maio a setembro).'),

('Cachoeiras e Trilhas de Paraty', 'turismo', 'official_doc',
 ARRAY['cachoeiras', 'trilhas', 'ecoturismo', 'natureza', 'aventura'],
 'Paraty tem inúmeras cachoeiras e trilhas na Mata Atlântica. As mais visitadas: Cachoeira do Tobogã (natural, a 8 km do centro — pedra polida pela água, entrada gratuita, estacionar na beira da estrada), Cachoeira do Poço do Tarzan (dentro da Fazenda Bananal, tem piscina natural entre árvores, entrada paga R$15), Cachoeira Pedra Branca (no Sítio das Pedras, boa para famílias), Fazenda Murycana (alambique histórico com trilha e cachoeira, visita guiada). Trilhas: Trilha do Morro do Cristo (2h, vista panorâmica da cidade e baía), Caminho do Ouro (estrada real de pedra do século XVII ligando Paraty às minas de ouro de MG — pode ser feita guiada). Recomendações: usar repelente, levar água, usar calçado fechado. Guias locais da AMETUR cobram R$50-100 por pessoa.'),

('Gastronomia Caiçara de Paraty', 'gastronomia', 'official_doc',
 ARRAY['gastronomia', 'caiçara', 'frutos do mar', 'cachaça', 'restaurantes'],
 'A culinária caiçara de Paraty é baseada em frutos do mar frescos, banana-da-terra e ingredientes da Mata Atlântica. Pratos típicos: peixe à caiçara (grelhado ou assado com banana e farofa), moqueca caiçara (diferente da baiana, leva leite de coco e dendê moderado), caldo de sururu, camarão na moranga, caldeirada de frutos do mar. A cachaça artesanal é símbolo da cidade — Paraty possui mais de 30 alambiques cadastrados. Mais famosos: Engenho d''Ouro, Coqueiros, Paratiana, Corisco. A Cachaça da Paraty Murycana ganhou prêmios internacionais. A FLIP (Festa Literária) e o Festival da Cachaça animam o calendário gastronômico. Restaurantes recomendados: Merlin o Mago (culinária caiçara refinada, no centro histórico), Banana da Terra (pratos locais criativos), Thai Brasil (fusão asiática), Punto di Vino (italiano, casarão colonial).'),

('FLIP — Festa Literária Internacional de Paraty', 'eventos', 'official_doc',
 ARRAY['flip', 'festival literário', 'literatura', 'cultura', 'evento'],
 'A FLIP (Festa Literária Internacional de Paraty) é um dos maiores eventos literários do mundo, realizado anualmente em julho no centro histórico de Paraty. Criada em 2003, reúne autores brasileiros e internacionais, editores, leitores e jornalistas. Em 2026 acontece na última semana de julho. O evento tem mesas de debate, leituras, performances e a tradicional Flipinha (programação infantil). Os livros homenageados e autores convidados são anunciados meses antes. Durante a FLIP, a cidade recebe dezenas de milhares de visitantes — hotéis lotam meses antes, recomenda-se reservar com antecedência. Há programação gratuita nas ruas e programação paga no Caucasinho (arena principal). A Livraria da FLIP e bancas de livros tomam o centro histórico.'),

('Festival da Cachaça de Paraty', 'eventos', 'official_doc',
 ARRAY['festival da cachaça', 'cachaça', 'alambiques', 'evento', 'agosto'],
 'O Festival da Cachaça, Cultura e Sabores de Paraty acontece todo mês de agosto e é um dos maiores festivais de cachaça artesanal do Brasil. Reúne produtores de cachaça de todo o país para degustações, concursos e apresentações culturais. Paraty é considerada a capital nacional da cachaça — a bebida é produzida na cidade há mais de 300 anos. Durante o festival, é possível visitar alambiques com tours guiados, degustar diferentes rótulos e conhecer o processo de produção da cachaça de alambique (diferente da industrial). Entrada parcialmente gratuita para áreas externas, ingressos para degustações especiais.'),

('Dicas Práticas — Estacionamento e Mobilidade em Paraty', 'dicas', 'official_doc',
 ARRAY['estacionamento', 'rotativo digital', 'mobilidade', 'acesso', 'dicas práticas'],
 'O centro histórico de Paraty é fechado para veículos motorizados durante o dia (horários variam por trecho). Estacionamentos: Área do Rotativo Digital cobre as principais vias próximas ao centro — pagar pelo app Go Paraty (disponível iOS e Android). Totens físicos do Rotativo estão espalhados na região do centro para orientação e pagamento presencial. Ticket de estacionamento rotativo: média R$3-5 por hora. Há estacionamentos privados próximos ao cais (R$20-40/dia). Para quem chega de carro: estacionar no Portal (entrada da cidade), entrar no centro a pé ou de bicicleta. Transporte: ônibus de Angra dos Reis, Rio de Janeiro (Costa Verde) e São Paulo (Reunidas). Táxi e aplicativos funcionam na cidade. Ciclismo é muito popular — aluguel de bicicletas R$30-60/dia.'),

('Melhor Época para Visitar Paraty', 'dicas', 'official_doc',
 ARRAY['clima', 'melhor época', 'temporada', 'planejamento', 'turismo'],
 'Paraty tem clima tropical úmido. Temporadas: Alta (dezembro a fevereiro e julho) — praias cheias, preços altos, reservar com antecedência. Baixa (março, abril, maio, setembro, outubro, novembro) — mais tranquilo, preços menores, chuvas possíveis. Melhor custo-benefício: maio a setembro (estação seca). Temperatura média: 25°C. Chuvas concentradas de novembro a março (verão tropical). Janeiro e fevereiro são os meses mais quentes e chuvosos. Inverno (junho/julho) tem dias secos e noites frescas — ótimo para trilhas e centro histórico. A FLIP em julho garante alta temporada mesmo no inverno. Dica: evitar Carnaval e Réveillon se quiser tranquilidade e preços acessíveis.'),

('Comunidades Tradicionais de Paraty', 'historia', 'official_doc',
 ARRAY['quilombolas', 'caiçaras', 'comunidades tradicionais', 'cultura', 'sustentabilidade'],
 'Paraty abriga importantes comunidades tradicionais: Comunidade Quilombola do Campinho da Independência (a 6 km do centro) — reconhecida oficialmente pelo governo, recebe visitantes para conhecer cultura afro-brasileira, artesanato e culinária ancestral. Comunidades Caiçaras (Ponta Negra, Trindade, Martim de Sá) — descendentes de indígenas e portugueses, vivem da pesca artesanal e preservam saberes tradicionais. O Parque Estadual da Serra do Mar e a APA Cairuçu protegem territórios dessas comunidades. Projetos de turismo comunitário permitem visitas sustentáveis com guias locais — renda fica na comunidade. Paraty tem reservas da Mata Atlântica com alto grau de preservação, sendo corredor ecológico importante.'),

('Caminho do Ouro — História Colonial de Paraty', 'historia', 'official_doc',
 ARRAY['caminho do ouro', 'estrada real', 'história colonial', 'mineração', 'trilha histórica'],
 'O Caminho do Ouro (ou Estrada Real) foi construído no século XVII para escoar o ouro das Minas Gerais para o Porto de Paraty e depois para Portugal. Foi o principal corredor econômico do Brasil colonial entre 1700 e 1730. A trilha histórica ainda existe e pode ser percorrida por 12 km entre Paraty e Cunha (SP). Guias credenciados da AMETUR conduzem os grupos — imprescindível para conhecer a história. Ao longo da trilha: pedras originais do século XVII, pontes de pedra, vista para a Serra da Bocaina e a Baía de Paraty. Saída pela Fazenda Paraíso (a 6 km do centro). Dificuldade moderada, 4-5 horas de caminhada. A fazenda Murycana também fica próxima ao trecho inicial.');
