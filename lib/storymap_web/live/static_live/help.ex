defmodule StorymapWeb.StaticLive.Help do
  use StorymapWeb, :live_view

  import Ecto.Changeset
  import Swoosh.Email, only: [new: 0, from: 2, reply_to: 2, subject: 2, text_body: 2, to: 2]

  alias Storymap.Mailer
  alias StorymapWeb.Plugs.RateLimit

  @contact_to {"Map Garden Team", "info@mapgarden.net"}
  @contact_from {"Map Garden Contact", "info@mapgarden.net"}

  @impl true
  def mount(_params, _session, socket) do
    client_ip = client_ip_string(socket)

    {:ok,
     socket
     |> assign(:page_title, "Help")
     |> assign(:contact_sent, false)
     |> assign(:contact_client_ip, client_ip)
     |> assign_contact_form(contact_changeset(%{}))}
  end

  @impl true
  def handle_event("validate_contact", %{"contact" => params}, socket) do
    changeset =
      params
      |> contact_changeset()
      |> Map.put(:action, :validate)

    {:noreply, assign_contact_form(socket, changeset)}
  end

  def handle_event("send_contact", %{"contact" => params}, socket) do
    cond do
      honeypot_tripped?(params) ->
        {:noreply, assign(socket, :contact_sent, true)}

      true ->
        changeset =
          params
          |> contact_changeset()
          |> Map.put(:action, :insert)

        cond do
          not changeset.valid? ->
            {:noreply, assign_contact_form(socket, changeset)}

          RateLimit.contact_form_check(socket.assigns.contact_client_ip) == :limit_exceeded ->
            {:noreply,
             socket
             |> put_flash(
               :error,
               "Too many messages from your network. Please try again in a little while."
             )
             |> assign_contact_form(changeset)}

          true ->
            data = apply_changes(changeset)

            case deliver_contact_email(data) do
              {:ok, _} ->
                socket =
                  case deliver_confirmation_email(data) do
                    {:ok, _} ->
                      socket

                    {:error, _} ->
                      put_flash(
                        socket,
                        :info,
                        "We received your message but could not send a copy to your inbox."
                      )
                  end

                {:noreply, assign(socket, :contact_sent, true)}

              {:error, _reason} ->
                {:noreply,
                 socket
                 |> put_flash(
                   :error,
                   "Sorry, we couldn't send your message. Please try again later."
                 )
                 |> assign_contact_form(changeset)}
            end
        end
    end
  end

  defp honeypot_tripped?(params) when is_map(params) do
    params
    |> Map.get("website", "")
    |> to_string()
    |> String.trim()
    |> Kernel.!=(<<>>)
  end

  defp client_ip_string(socket) do
    case Phoenix.LiveView.get_connect_info(socket, :peer_data) do
      %{address: addr} when is_tuple(addr) ->
        addr |> :inet.ntoa() |> to_string()

      _ ->
        "unknown"
    end
  end

  defp assign_contact_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :contact_form, to_form(changeset, as: :contact))
  end

  defp contact_changeset(params) do
    types = %{name: :string, email: :string, message: :string}

    {%{}, types}
    |> cast(params, Map.keys(types))
    |> update_change(:name, &String.trim/1)
    |> update_change(:email, &String.trim/1)
    |> update_change(:message, &String.trim/1)
    |> validate_required([:name, :email, :message])
    |> validate_length(:name, max: 200)
    |> validate_length(:email, max: 200)
    |> validate_length(:message, min: 5, max: 5000)
    |> validate_format(:email, ~r/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "must be a valid email")
  end

  defp deliver_contact_email(%{name: name, email: email, message: message}) do
    body = """
    New message from the Map Garden contact form.

    Name:    #{name}
    Email:   #{email}

    Message:
    #{message}
    """

    new()
    |> to(@contact_to)
    |> from(@contact_from)
    |> reply_to({name, email})
    |> subject("Contact form: #{name}")
    |> text_body(body)
    |> Mailer.deliver()
  end

  defp deliver_confirmation_email(%{name: name, email: email, message: message}) do
    body = """
    Hi #{name},

    Thanks for contacting Map Garden. We received your message and will reply when we can.

    For your records, here is what you sent:

    #{message}

    — Map Garden
    info@mapgarden.net
    """

    new()
    |> to({name, email})
    |> from(@contact_from)
    |> subject("We received your message — Map Garden")
    |> text_body(body)
    |> Mailer.deliver()
  end
end
