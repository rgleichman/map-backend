defmodule Storymap.AdminTest do
  use ExUnit.Case, async: true

  alias Storymap.Accounts.{Scope, User}
  alias Storymap.Admin

  test "admin?/1 returns true at minimum admin level" do
    assert Admin.admin?(%User{admin_level: 10})
  end

  test "admin?/1 returns false below minimum admin level" do
    refute Admin.admin?(%User{admin_level: 9})
    refute Admin.admin?(%User{admin_level: 1})
  end

  test "admin?/1 returns false for nil and non-user values" do
    refute Admin.admin?(nil)
    refute Admin.admin?(%{})
  end

  test "admin_scope?/1 returns true for admin scope" do
    assert Admin.admin_scope?(%Scope{user: %User{admin_level: 10}})
  end

  test "admin_scope?/1 returns false for nil and scope without user" do
    refute Admin.admin_scope?(nil)
    refute Admin.admin_scope?(%Scope{user: nil})
    refute Admin.admin_scope?(%Scope{user: %User{admin_level: 9}})
  end

  test "min_level/0 returns 10" do
    assert Admin.min_level() == 10
  end
end
