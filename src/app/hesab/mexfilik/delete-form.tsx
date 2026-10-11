'use client'

import { useActionState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { deleteAccountAction, type ActionState } from '../actions'

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, {} as ActionState)
  return (
    <form action={action} className="mt-5 grid max-w-md gap-4">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Field label="Cari şifrə" error={state.errors?.password}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <Field label='Təsdiq üçün "SİL" yazın' error={state.errors?.confirm}>
        {(p) => <Input {...p} name="confirm" autoComplete="off" required />}
      </Field>
      <div>
        <Button type="submit" variant="danger" loading={pending}>
          Hesabı birdəfəlik sil
        </Button>
      </div>
    </form>
  )
}
