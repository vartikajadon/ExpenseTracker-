/**
 * AI-Assisted Expense Tracker
 * 
 * This script handles the initialization and future logic 
 * for the AI-Assisted Expense Tracker application.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State: Array to hold all expense objects
    let expenses = [];
    let selectedCurrency = 'INR';

    // Currency Symbols Mapping
    const currencySymbols = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£'
    };

    // Select DOM elements
    const expenseForm = document.getElementById('expense-form');
    const expenseListContainer = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-state');
    const expenseTable = document.getElementById('expense-table');
    const totalAmountDisplay = document.getElementById('total-amount');
    const currencySelect = document.getElementById('currency-select');
    const dateInput = document.getElementById('date');

    /**
     * Sets the maximum selectable date to today's date.
     * This prevents users from adding future expenses.
     */
    const setMaxDate = () => {
        const today = new Date().toISOString().split('T')[0];
        if (dateInput) {
            dateInput.max = today;
        }
    };

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
     * Calculates the total sum of all expenses.
     * @returns {number} The total amount.
     */
    const calculateTotal = () => {
        return expenses.reduce((total, expense) => {
            return total + (expense.amount || 0);
        }, 0);
    };

    /**
     * Updates the total spent summary display.
     */
    const updateSummary = () => {
        const total = calculateTotal();
        const symbol = currencySymbols[selectedCurrency];
        totalAmountDisplay.textContent = `${symbol}${total.toFixed(2)}`;
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
            updateSummary();
            return;
        }

        // Show table, hide empty state
        emptyState.classList.add('hidden');
        expenseTable.classList.remove('hidden');

        // Sort: Latest added first
        const sortedExpenses = [...expenses].reverse();

        // Get current symbol
        const symbol = currencySymbols[selectedCurrency];

        // Build the table rows
        sortedExpenses.forEach(expense => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${expense.date}</td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td class="amount-cell">${symbol}${expense.amount.toFixed(2)}</td>
                <td>${expense.note || '-'}</td>
                <td>
                    <button class="delete-btn" data-id="${expense.id}">Delete</button>
                </td>
            `;
            
            expenseListContainer.appendChild(row);
        });

        // Update the overall summary
        updateSummary();
    };

    /**
     * Deletes an expense from the list and storage.
     * @param {number} id - The unique ID of the expense to delete.
     */
    const deleteExpense = (id) => {
        const isConfirmed = confirm("Are you sure you want to delete this expense?");
        
        if (isConfirmed) {
            expenses = expenses.filter(expense => expense.id !== id);
            saveToLocalStorage();
            renderExpenses();
        }
    };

    /**
     * Handles the form submission to create a new expense.
     * @param {Event} event - The form submission event.
     */
    const handleFormSubmit = (event) => {
        event.preventDefault();

        const amountValue = document.getElementById('amount').value;
        const categoryValue = document.getElementById('category').value;
        const dateValue = document.getElementById('date').value;
        const noteValue = document.getElementById('note').value;

        // Basic validation
        if (!amountValue || !categoryValue || !dateValue) {
            alert("Please fill in all required fields.");
            return;
        }

        // Future date validation check
        const today = new Date().toISOString().split('T')[0];
        if (dateValue > today) {
            alert("Error: Expense date cannot be in the future.");
            return;
        }

        const newExpense = {
            id: Date.now(),
            amount: parseFloat(amountValue),
            category: categoryValue,
            date: dateValue,
            note: noteValue
        };

        expenses.push(newExpense);
        saveToLocalStorage();
        renderExpenses();
        expenseForm.reset();
    };

    /**
     * Handles changes to the currency selector.
     * @param {Event} event - The change event.
     */
    const handleCurrencyChange = (event) => {
        selectedCurrency = event.target.value;
        // Re-render everything to update symbols
        renderExpenses();
    };

    // Initialization
    setMaxDate();
    loadFromLocalStorage();
    renderExpenses();

    // Event Listeners
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleFormSubmit);
    }

    if (currencySelect) {
        currencySelect.addEventListener('change', handleCurrencyChange);
    }

    if (expenseListContainer) {
        expenseListContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const idToDelete = Number(event.target.dataset.id);
                deleteExpense(idToDelete);
            }
        });
    }
});
