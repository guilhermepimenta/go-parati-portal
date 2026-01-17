describe('Homepage Interactions', () => {
    beforeEach(() => {
        cy.viewport(1280, 720);
        cy.visit('/');
        // Wait for potential initial animations
        cy.wait(1000);
    });

    it('should display the main sections', () => {
        // Hero Section
        cy.contains('Viva a Magia de').should('be.visible');
        cy.contains('Descubra o Inesquecível').should('be.visible');

        // Featured Event
        cy.get('img[alt="Festival da Cachaça, Cultura e Sabores"]').should('exist'); // Or dynamic selector
        cy.contains('Destaque').should('be.visible');

        // Categories
        cy.contains('Gastronomia').should('be.visible');
        cy.contains('História').should('be.visible');
    });

    it('should filter businesses by category', () => {
        // Initial state: Should see all or specific default
        // Click "Gastronomia"
        cy.contains('button', 'Gastronomia').click();

        // Button should become active (blue background class check or check for X icon)
        cy.contains('button', 'Gastronomia').find('svg.text-white\\/70').should('exist'); // The X icon implies selection

        // "Clear Filters" button should appear
        cy.contains('button', 'Limpar Filtros').should('be.visible');

        // Results should filter (check for a known restaurant)
        cy.contains('Restaurante do Porto').should('be.visible');
        // A non-gastronomy item should NOT be visible (e.g., Igreja Santa Rita - História)
        // Note: Logic depends on how many items are mocked. 
    });

    it('should clear filters via "Limpar Filtros" button', () => {
        // Activate a filter
        cy.contains('button', 'História').click();
        cy.contains('button', 'Limpar Filtros').should('be.visible');

        // Click Clear
        cy.contains('button', 'Limpar Filtros').click();

        // Button should disappear
        cy.contains('button', 'Limpar Filtros').should('not.exist');

        // Category should reset (X icon gone)
        cy.contains('button', 'História').find('svg.text-white\\/70').should('not.exist');
    });

    it('should open and close the Interactive Map Modal', () => {
        // Scroll to footer to ensure visibility
        cy.scrollTo('bottom');

        // Find the Footer Map container and click it
        // The div has an onClick handler, we can find it by class or context
        cy.get('footer').find('.h-48.rounded-2xl').click();

        // Modal should appear
        cy.contains('button', 'Minha Localização').should('be.visible');
        cy.get('.leaflet-container').should('exist');

        // Close modal
        cy.get('button[title="Fechar"]').click();
        cy.contains('button', 'Minha Localização').should('not.exist');
    });

    it('should keep Featured Event visible when filtering', () => {
        // Ensure Highlight section is visible initially
        cy.contains('Festival da Cachaça').should('be.visible');

        // Apply a filter
        cy.contains('button', 'Aventura').click();

        // Highlight section should STILL be visible
        cy.contains('Festival da Cachaça').should('be.visible');
    });
});
