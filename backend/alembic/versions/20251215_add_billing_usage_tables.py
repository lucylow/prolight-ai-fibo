"""add billing usage tables and fields

Revision ID: 20251215_add_billing_usage_tables
Revises: 20251214_create_runs_jobs_assets
Create Date: 2025-12-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '20251215_add_billing_usage_tables'
down_revision = '20251214_create_runs_jobs_assets'
branch_labels = None
depends_on = None


def upgrade():
    # Create users table (if it doesn't exist)
    # Check if table exists first (SQLite doesn't support IF NOT EXISTS in create_table)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('email', sa.Text(), nullable=False, unique=True),
            sa.Column('stripe_customer_id', sa.Text(), nullable=True),
            sa.Column('role', sa.Text(), nullable=False, server_default='viewer'),
            sa.Column('name', sa.Text(), nullable=True),
            sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        )
        op.create_index('ix_users_email', 'users', ['email'])
        op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'])

    # Add subscription_item_id column to subscriptions table if it doesn't exist
    if 'subscriptions' in existing_tables:
        try:
            op.add_column('subscriptions', sa.Column('stripe_subscription_item_id', sa.Text(), nullable=True))
            op.create_index('ix_subscriptions_stripe_subscription_item_id', 'subscriptions', ['stripe_subscription_item_id'])
        except Exception:
            # Column might already exist
            pass

    # Create usage_records table
    if 'usage_records' not in existing_tables:
        op.create_table(
            'usage_records',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('stripe_subscription_item_id', sa.Text(), nullable=False),
            sa.Column('quantity', sa.Numeric(), nullable=False),
            sa.Column('reported_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('stripe_report_id', sa.Text(), nullable=True),
            sa.Column('metadata', sa.Text(), nullable=True),
        )
        op.create_index('ix_usage_records_user_id', 'usage_records', ['user_id'])
        op.create_index('ix_usage_records_stripe_subscription_item_id', 'usage_records', ['stripe_subscription_item_id'])
        op.create_index('ix_usage_records_reported_at', 'usage_records', ['reported_at'])


def downgrade():
    # Drop usage_records table
    op.drop_index('ix_usage_records_reported_at', table_name='usage_records', if_exists=True)
    op.drop_index('ix_usage_records_stripe_subscription_item_id', table_name='usage_records', if_exists=True)
    op.drop_index('ix_usage_records_user_id', table_name='usage_records', if_exists=True)
    op.drop_table('usage_records')

    # Remove subscription_item_id column from subscriptions
    try:
        op.drop_index('ix_subscriptions_stripe_subscription_item_id', table_name='subscriptions', if_exists=True)
        op.drop_column('subscriptions', 'stripe_subscription_item_id')
    except Exception:
        pass

    # Drop users table (be careful - this will delete all user data!)
    # Commented out by default to prevent accidental data loss
    # op.drop_index('ix_users_stripe_customer_id', table_name='users', if_exists=True)
    # op.drop_index('ix_users_email', table_name='users', if_exists=True)
    # op.drop_table('users')
