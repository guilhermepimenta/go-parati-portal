describe('Homepage Interactions', () => {
    beforeEach(() => {
        cy.viewport(1280, 720);
        cy.visit('/');
        cy.get('main#main-content', { timeout: 10000 }).should('be.visible');
    });

    it('should display the main sections', () => {
        cy.get('nav').should('be.visible');
        cy.get('main#main-content').should('be.visible');
        cy.get('#category-scroll-container').should('be.visible');
        cy.get('#category-scroll-container button').its('length').should('be.greaterThan', 2);

        // Featured event can be managed dynamically. If active, it should render correctly.
        cy.get('body').then(($body) => {
            if ($body.text().toLowerCase().includes('destaque')) {
                cy.contains(/destaque/i).should('be.visible');
            }
        });
    });

    it('should filter businesses by category', () => {
        cy.get('#category-scroll-container button').first().as('firstCategory');
        cy.get('@firstCategory').click();
        cy.get('@firstCategory').should('have.class', 'bg-ink');

        // Ensure at least one business card still renders after filtering
        cy.get('main#main-content').find('[class*="rounded-"]').should('exist');
    });

    it('should clear filters via "Limpar Filtros" button', () => {
        cy.get('#category-scroll-container button').first().as('firstCategory');
        cy.get('@firstCategory').click();

        cy.get('#category-scroll-container').within(() => {
            cy.get('button[title]').click();
        });

        cy.get('@firstCategory').should('not.have.class', 'bg-ink');
    });

    it('should open and close the Interactive Map Modal', () => {
        cy.scrollTo('bottom');
        cy.get('footer').find('.h-48.rounded-2xl').click();

        cy.contains('button', 'Minha Localização').should('be.visible');
        cy.get('.leaflet-container').should('exist');

        cy.get('button[aria-label="Fechar mapa"]').click();
        cy.contains('button', 'Minha Localização').should('not.exist');
    });

    it('should keep Featured Event visible when filtering', () => {
        cy.get('body').then(($body) => {
            const hasFeatured = $body.text().toLowerCase().includes('destaque');

            cy.get('#category-scroll-container button').first().click();

            if (hasFeatured) {
                cy.contains(/destaque/i).should('be.visible');
            }
        });
    });
});
