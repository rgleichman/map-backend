defmodule Storymap.Trust.EigenTrustTest do
  use ExUnit.Case, async: true

  alias Storymap.Trust.EigenTrust

  test "calibrate single user is 1.0" do
    assert EigenTrust.calibrate(%{1 => 0.5}) == %{1 => 1.0}
  end

  test "calibrate ranks lowest to 0 and highest to 1" do
    cal = EigenTrust.calibrate(%{1 => 0.1, 2 => 0.5, 3 => 0.9})
    assert cal[1] == 0.0
    assert cal[3] == 1.0
    assert cal[2] == 0.5
  end

  test "iterate concentrates mass on seed-connected users" do
    # S=1 vouches H=2; X=3 and Y=4 vouch each other
    user_ids = [1, 2, 3, 4]
    p = %{1 => 1.0, 2 => 0.0, 3 => 0.0, 4 => 0.0}

    c = %{
      {1, 2} => 1.0,
      {2, 1} => 1.0,
      {3, 4} => 1.0,
      {4, 3} => 1.0
    }

    t = EigenTrust.iterate(c, p, user_ids, a: 0.85, tol: 1.0e-12)

    assert t[1] + t[2] > 0.9
    assert t[3] < 0.05
    assert t[4] < 0.05
  end
end
