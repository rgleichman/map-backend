defmodule Storymap.Accounts.PolicyTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures

  alias Storymap.Accounts.Policy

  test "muted?/1 is false for unmuted users" do
    refute Policy.muted?(user_fixture())
  end

  test "muted?/1 is true for muted users" do
    assert Policy.muted?(muted_user_fixture())
  end

  test "authorize_write?/1 returns ok for unmuted users" do
    assert :ok = Policy.authorize_write?(user_fixture())
  end

  test "authorize_write?/1 returns forbidden for muted users" do
    assert {:error, :forbidden} = Policy.authorize_write?(muted_user_fixture())
  end
end
