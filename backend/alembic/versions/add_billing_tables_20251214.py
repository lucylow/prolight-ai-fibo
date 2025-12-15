"""add_billing_tables

Revision ID: add_billing_tables_20251214
Revises: <SET_DOWN_REVISION>
Create Date: 2025-12-14 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = 'add_billing_tables_20251214'
down_revision = '<SET_DOWN_REVISION>'  # <<-- REPLACE this with your current alembic head
branch_labels = None
depends_on = None


def upgrade():
    # Users (if you already have a users table, skip creating it here)
    # If you already have users in another module, remove / adapt this block.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('email', sa.String(length=255), nullable=False, unique=True),
            sa.Column('full_name', sa.String(length=255), nullable=True),
            sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
            sa.Column('role', sa.String(length=32), nullable=False, server_default='viewer'),
            sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now()),
            sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        )
        op.create_index('ix_users_email', 'users', ['email'])
        op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'])
    else:
        # Add full_name column if it doesn't exist (migrating from 'name' to 'full_name')
        try:
            op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))
        except Exception:
            # Column might already exist
            pass

    if 'invoices' not in existing_tables:
        op.create_table(
            'invoices',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('stripe_invoice_id', sa.String(length=255), unique=True, nullable=False),
            sa.Column('stripe_customer_id', sa.String(length=255), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('status', sa.String(length=64), nullable=False),
            sa.Column('currency', sa.String(length=8), nullable=False),
            sa.Column('amount_due', sa.Integer(), nullable=False),
            sa.Column('amount_paid', sa.Integer(), nullable=False),
            sa.Column('hosted_invoice_url', sa.String(length=1024), nullable=True),
            sa.Column('invoice_pdf', sa.String(length=1024), nullable=True),
            sa.Column('billing_reason', sa.String(length=128), nullable=True),
            sa.Column('period_start', sa.TIMESTAMP(), nullable=True),
            sa.Column('period_end', sa.TIMESTAMP(), nullable=True),
            sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now()),
            sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        )
    else:
        # Add user_id column if it doesn't exist
        try:
            op.add_column('invoices', sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
        except Exception:
            # Column might already exist
            pass

    if 'subscriptions' not in existing_tables:
        op.create_table(
            'subscriptions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('stripe_subscription_id', sa.String(length=255), unique=True, nullable=False),
            sa.Column('stripe_customer_id', sa.String(length=255), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('status', sa.String(length=64), nullable=False),
            sa.Column('price_id', sa.String(length=255), nullable=True),
            sa.Column('subscription_item_id', sa.String(length=255), nullable=True),
            sa.Column('interval', sa.String(length=32), nullable=True),
            sa.Column('current_period_start', sa.TIMESTAMP(), nullable=True),
            sa.Column('current_period_end', sa.TIMESTAMP(), nullable=True),
            sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now()),
            sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        )
    else:
        # Add user_id and subscription_item_id columns if they don't exist
        try:
            op.add_column('subscriptions', sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
        except Exception:
            pass
        try:
            # Check if subscription_item_id exists, if not add it
            # Also handle migration from stripe_subscription_item_id to subscription_item_id
            op.add_column('subscriptions', sa.Column('subscription_item_id', sa.String(length=255), nullable=True))
        except Exception:
            pass

    if 'usage_records' not in existing_tables:
        op.create_table(
            'usage_records',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('stripe_subscription_item_id', sa.String(length=255), nullable=False),
            sa.Column('quantity', sa.Numeric(), nullable=False),
            sa.Column('reported_at', sa.TIMESTAMP(), server_default=func.now()),
            sa.Column('stripe_report_id', sa.String(length=255), nullable=True),
            sa.Column('metadata', sa.Text(), nullable=True),
        )


def downgrade():
    op.drop_table('usage_records')
    op.drop_table('subscriptions')
    op.drop_table('invoices')
    # Note: users table drop commented out to prevent accidental data loss
    # op.drop_table('users')

