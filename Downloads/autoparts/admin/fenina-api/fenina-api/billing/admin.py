from django.contrib import admin
from .models import Invoice, InvoiceLine, Payment, Reminder

class LineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 1

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "client", "issue_date", "due_date", "status")
    inlines = [LineInline, PaymentInline]

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("invoice", "days_overdue", "sent", "created_at")
