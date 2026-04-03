/**
 * AI-Assisted Expense Tracker
 * 
 * This script handles the initialization and future logic 
 * for the AI-Assisted Expense Tracker application.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State: Array to hold all expense objects
    let expenses = [];

    // Select DOM elements
    const expenseForm = document.getElementById('expense-form');
    const expenseListContainer = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-state');
    const expenseTable = document.getElementById('expense-table');

    /**
     * Loads expenses from localStorage on application start.
     */
    const loadFromLocalStorage = () => {
        const savedExpenses = localStorage.getItem('expenses');
        if (savedExpenses) {
            expenses = JSON.parse(savedExpenses);
        }
    };

    /**
     * Saves the current expenses array to localStorage.
     */
    const saveToLocalStorage = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    };

    /**
     * Renders the list of expenses into the table.
     */
    const renderExpenses = () => {
        // Clear current list items
        expenseListContainer.innerHTML = '';

        // Check if there are any expenses to display
        if (expenses.length === 0) {
            emptyState.classList.remove('hidden');
            expenseTable.classList.add('hidden');
            return;
        }

        // Show table, hide empty state
        emptyState.classList.add('hidden');
        expenseTable.classList.remove('hidden');

        // Create a copy of the array and reverse it to show newest expenses first
        const sortedExpenses = [...expenses].reverse();

        // Build the table rows
        sortedExpenses.forEach(expense => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${expense.date}</td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td class="amount-cell">$${expense.amount.toFixed(2)}</td>
                <td>${expense.note || '-'}</td>
            `;
            
            expenseListContainer.appendChild(row);
        });
    };

    /**
     * Handles the form submission to create a new expense.
     * @param {Event} event - The form submission event.
     */
    const handleFormSubmit = (event) => {
        event.preventDefault();

        // Get values from the form inputs
        const amountValue = document.getElementById('amount').value;
        const categoryValue = document.getElementById('category').value;
        const dateValue = document.getElementById('date').value;
        const noteValue = document.getElementById('note').value;

        // Basic validation
        if (!amountValue || !categoryValue || !dateValue) {
            alert("Please fill in all required fields.");
            return;
        }

        // Create the new expense object
        const newExpense = {
            id: Date.now(),
            amount: parseFloat(amountValue),
            category: categoryValue,
            date: dateValue,
            note: noteValue
        };

        // Add to our state array
        expenses.push(newExpense);

        // Persistent storage
        saveToLocalStorage();

        // Refresh the display immediately
        renderExpenses();

        // Reset the form
        expenseForm.reset();
        
        console.log("Expense added successfully:", newExpense);
    };

    // Initialization
    loadFromLocalStorage();
    renderExpenses();

    // Event Listeners
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleFormSubmit);
    }
});
