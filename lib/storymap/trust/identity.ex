defmodule Storymap.Trust.Identity do
  @moduledoc """
  Non-decaying identity trust component `T_id`. See `docs/TRUST.md` §4.8.
  """

  alias Storymap.Accounts.User

  @spec t_id(User.t(), keyword()) :: float()
  def t_id(%User{} = user, opts \\ []) do
    email_bonus =
      Keyword.get(
        opts,
        :email_confirmed_bonus,
        Storymap.Trust.config(:email_confirmed_bonus, 0.2)
      )

    bonus =
      if user.confirmed_at do
        email_bonus
      else
        0.0
      end

    bonus |> max(0.0) |> min(1.0)
  end
end
