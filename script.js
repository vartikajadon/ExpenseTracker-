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
                <td>
                    <button class="delete-btn" data-id="${expense.id}">Delete</button>
                </td>
            `;
            
            expenseListContainer.appendChild(row);
        });
    };

    /**
     * Deletes an expense from the list and storage.
     * @param {number} id - The unique ID of the expense to delete.
     */
    const deleteExpense = (id) => {
        // Ask for confirmation before deleting
        const isConfirmed = confirm("Are you sure you want to delete this expense?");
        
        if (isConfirmed) {
            // Filter out the expense with the given ID
            expenses = expenses.filter(expense => expense.id !== id);
            
            // Save updated array to localStorage
            saveToLocalStorage();
            
            // Re-render the list
            renderExpenses();
            
            console.log("Expense deleted successfully. ID:", id);
        }
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

    // Event Delegation: Listen for clicks on the table body to handle deletions
    if (expenseListContainer) {
        expenseListContainer.addEventListener('click', (event) => {
            // Check if the clicked element is a delete button
            if (event.target.classList.contains('delete-btn')) {
                // Get the ID from the data attribute (ensure it's a number)
                const idToDelete = Number(event.target.dataset.id);
                deleteExpense(idToDelete);
            }
        });
    }
});
