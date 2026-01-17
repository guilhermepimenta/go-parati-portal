
import React from 'react';
import { Business, Totem } from './types';

export const CATEGORIES = [
  { id: 'Gastronomia', name: 'Gastronomia', icon: 'Utensils' },
  { id: 'História', name: 'História', icon: 'Castle' },
  { id: 'Aventura', name: 'Aventura', icon: 'Mountain' },
  { id: 'Hospedagem', name: 'Hospedagem', icon: 'Bed' },
  { id: 'Comércio', name: 'Comércio', icon: 'ShoppingBag' },

];


export const MOCK_INSTAGRAM_FEED = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=800&auto=format&fit=crop',
    caption: '⚠️ COMUNICADO: Obras de revitalização no Centro Histórico iniciam nesta segunda-feira. #PrefeituraParaty #Obras #Patrimonio',
    likes: '450',
    comments: '23',
    timestamp: '2h'
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1518182170546-0766aaef41ae?q=80&w=800&auto=format&fit=crop',
    caption: 'Festival da Cachaça, Cultura e Sabores de Paraty começa nesta semana! Venha prestigiar. 🥃🎶 #FestivalDaCachaca #Cultura #Turismo',
    likes: '1.2k',
    comments: '85',
    timestamp: '5h'
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1548777123-e216912df7d8?q=80&w=800&auto=format&fit=crop',
    caption: 'Campanha de vacinação contra a gripe disponível em todos os postos de saúde. Vacine-se! 💉 #Saude #Vacina #Paraty',
    likes: '890',
    comments: '41',
    timestamp: '1d'
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop',
    caption: 'Paraty é eleita um dos melhores destinos culturais do Brasil! Orgulho da nossa cidade. 🏆 #Premio #TurismoCultural',
    likes: '2.5k',
    comments: '150',
    timestamp: '2d'
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1544640808-32ca72ac7f37?q=80&w=800&auto=format&fit=crop',
    caption: 'Dia de sol perfeito na Praia do Sono! Quem ama esse paraíso? ☀️🌊 #PraiaDoSono #Natureza #Paraiso',
    likes: '3.1k',
    comments: '210',
    timestamp: '3d'
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1582234033109-cc86a60e0d5e?q=80&w=800&auto=format&fit=crop',
    caption: 'Patrimônio Mundial da UNESCO: nossa arquitetura conta a história do Brasil. ⛪ #Historia #UNESCO #Brasil',
    likes: '1.8k',
    comments: '98',
    timestamp: '4d'
  }
];

export const TOTEM_DATA: Totem[] = [
  {
    id: 't1',
    name: 'Totem Praça da Matriz',
    status: 'online',
    location: {
      lat: -23.2212,
      lng: -44.7128,
      address: 'Praça da Matriz, S/N - Centro'
    }
  },
  {
    id: 't2',
    name: 'Totem Cais do Porto',
    status: 'online',
    location: {
      lat: -23.2205,
      lng: -44.7115,
      address: 'Rua Beira Rio, Próximo ao Cais'
    }
  },
  {
    id: 't3',
    name: 'Totem Rodoviária',
    status: 'online',
    location: {
      lat: -23.2185,
      lng: -44.7192,
      address: 'Rua Jabaquara - Entrada Rodoviária'
    }
  },
  {
    id: 't4',
    name: 'Totem Estacionamento Jabaquara',
    status: 'offline',
    location: {
      lat: -23.2105,
      lng: -44.7155,
      address: 'Av. Jabaquara, Orla'
    }
  }
];

export const MOCK_DATA: Business[] = [
  {
    id: '1',
    name: 'Restaurante do Porto',
    category: 'Gastronomia',
    description: 'Culinária caiçara tradicional com frutos do mar frescos e vista para o cais.',
    long_description: 'Aninhado no coração do Centro Histórico de Paraty, o Restaurante do Porto oferece uma jornada culinária através dos sabores ricos da cozinha costeira brasileira. Alojado num edifício colonial preservado do século XVIII, o nosso ambiente combina o charme rústico com o conforto moderno.',
    rating: 4.8,
    review_count: 120,
    price_level: 3,
    image_url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      lat: -23.2201,
      lng: -44.7135,
      address: 'Rua do Comércio, 12 - Centro Histórico'
    },
    amenities: ['Wi-Fi Grátis', 'Ar Condicionado', 'Mesas Externas', 'Pet Friendly', 'Música ao Vivo'],
    opening_hours: {
      'Seg - Qui': '12:00 - 22:00',
      'Sex - Sáb': '12:00 - 23:30',
      'Dom': '12:00 - 22:00'
    },
    is_featured: true
  },
  {
    id: '2',
    name: 'Igreja Santa Rita',
    category: 'História',
    description: 'O cartão postal de Paraty, construída em 1722 por pardos libertos.',
    long_description: 'Símbolo máximo de Paraty, esta igreja em estilo barroco-rococó abriga o Museu de Arte Sacra. Sua arquitetura é um testemunho da sofisticação colonial brasileira.',
    rating: 4.9,
    review_count: 450,
    price_level: 1,
    image_url: 'https://images.unsplash.com/photo-1582234033109-cc86a60e0d5e?auto=format&fit=crop&q=80&w=800',
    location: {
      lat: -23.2198,
      lng: -44.7118,
      address: 'Largo de Santa Rita - Centro Histórico'
    },
    is_featured: true
  },
  {
    id: '3',
    name: 'Caminho do Ouro',
    category: 'Aventura',
    description: 'Trilha histórica pavimentada por escravos no século XVIII.',
    long_description: 'Siga os passos dos colonizadores nesta trilha preservada que liga Paraty a Minas Gerais. Uma imersão na Mata Atlântica e na história do ciclo do ouro.',
    rating: 4.7,
    review_count: 85,
    price_level: 2,
    image_url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800',
    location: {
      lat: -23.2355,
      lng: -44.8021,
      address: 'Estrada Paraty-Cunha, km 10'
    }
  },
  {
    id: '4',
    name: 'Pousada Literária',
    category: 'Hospedagem',
    description: 'Luxo e cultura no coração do Centro Histórico.',
    rating: 4.9,
    review_count: 320,
    price_level: 4,
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
    location: {
      lat: -23.2215,
      lng: -44.7145,
      address: 'Rua do Comércio, 362'
    },
    opening_hours: {
      'Seg - Dom': '24h'
    },
  },
  {
    id: '5',
    name: 'Armazém Paraty',
    category: 'Comércio',
    description: 'Artesanato local, cerâmicas e souvenirs feitos por artistas da região.',
    rating: 4.6,
    review_count: 64,
    price_level: 2,
    image_url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800',
    location: {
      lat: -23.2192,
      lng: -44.7138,
      address: 'Rua da Lapa, 15'
    },
    opening_hours: {
      'Seg - Sex': '09:00 - 18:00',
      'Sáb': '09:00 - 14:00',
      'Dom': 'Fecha'
    },
  },
  {
    id: '6',
    name: 'Forte Defensor Perpétuo',
    category: 'História',
    description: 'Museu e antigo forte com vista panorâmica da baía.',
    rating: 4.8,
    review_count: 215,
    price_level: 1,
    image_url: 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&q=80&w=800',
    location: {
      lat: -23.2136,
      lng: -44.7126,
      address: 'Morro da Vila Velha'
    }
  }
];
