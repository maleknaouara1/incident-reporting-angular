import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IncidentActionsComponent } from './incident-actions.component';
import { IncidentService } from '../../../../core/services/incident.service';
import { UserRole } from '../../../../core/services/auth.service';
import { IncidentCategory, IncidentDto, IncidentPriority, IncidentStatus } from '../../../../core/models/incident.model';

const ME = 'user-me';

const incident = (status: IncidentStatus, assignedToUserId: string | null = null): IncidentDto => ({
  id: 'inc-1',
  title: 'VPN down',
  description: 'Remote staff cannot connect',
  priority: IncidentPriority.High,
  status,
  category: IncidentCategory.Network,
  createdByUserId: 'reporter-1',
  assignedToUserId,
  createdAtUtc: new Date().toISOString(),
  updatedAtUtc: null,
  resolvedAtUtc: null,
  aiSummary: null,
  aiSuggestedResolution: null,
  aiConfidenceScore: null,
  comments: []
});

const ok = (data: IncidentDto) => of({ success: true, message: '', data, errors: null });

describe('IncidentActionsComponent', () => {
  let fixture: ComponentFixture<IncidentActionsComponent>;
  let service: jasmine.SpyObj<IncidentService>;
  let emitted: IncidentDto[];

  const setup = (status: IncidentStatus, role = UserRole.Engineer, assignedTo: string | null = null) => {
    localStorage.setItem('auth_session', JSON.stringify({
      userId: ME, fullName: 'Me', email: 'me@test.test', role,
      accessToken: 'a', refreshToken: 'r', expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString()
    }));
    fixture = TestBed.createComponent(IncidentActionsComponent);
    fixture.componentRef.setInput('incident', incident(status, assignedTo));
    emitted = [];
    fixture.componentInstance.incidentChange.subscribe(i => emitted.push(i));
    fixture.detectChanges();
  };

  const buttons = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
    .map(b => b.textContent!.trim());
  const click = (label: string) => {
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find(b => b.textContent!.includes(label))!;
    button.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<IncidentService>('IncidentService', ['assign', 'updateStatus', 'addComment']);
    TestBed.configureTestingModule({
      imports: [IncidentActionsComponent],
      providers: [{ provide: IncidentService, useValue: service }]
    });
  });

  afterEach(() => localStorage.clear());

  it('offers self-assignment on a new incident but no status change', () => {
    setup(IncidentStatus.New);
    expect(buttons()).toContain('Assign to me');
    expect(buttons().some(b => b.startsWith('Move to'))).toBeFalse();
  });

  it('assigns the incident to the current user and emits the update', () => {
    setup(IncidentStatus.New);
    const updated = incident(IncidentStatus.Assigned, ME);
    service.assign.and.returnValue(ok(updated));

    click('Assign to me');

    expect(service.assign).toHaveBeenCalledWith('inc-1', ME);
    expect(emitted).toEqual([updated]);
  });

  it('hides "Assign to me" when already assigned to the current user', () => {
    setup(IncidentStatus.Assigned, UserRole.Engineer, ME);
    expect(buttons()).not.toContain('Assign to me');
  });

  it('moves the status one step forward', () => {
    setup(IncidentStatus.InProgress);
    service.updateStatus.and.returnValue(ok(incident(IncidentStatus.Resolved)));

    click('Move to Resolved');

    expect(service.updateStatus).toHaveBeenCalledWith('inc-1', IncidentStatus.Resolved);
  });

  it('posts a trimmed comment without sending an author', () => {
    setup(IncidentStatus.InProgress);
    service.addComment.and.returnValue(ok(incident(IncidentStatus.InProgress)));
    fixture.componentInstance.commentForm.setValue({ message: '  Checked the logs  ' });
    fixture.detectChanges();

    click('Post comment');

    expect(service.addComment).toHaveBeenCalledWith('inc-1', 'Checked the logs');
    expect(fixture.componentInstance.commentForm.getRawValue().message).toBe('');
  });

  it('shows the API error message', () => {
    setup(IncidentStatus.InProgress);
    service.updateStatus.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'Invalid status transition.', errors: ['Cannot move from 3 to 4'] }
    })));

    click('Move to Resolved');

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.banner.error')!;
    expect(banner.textContent).toContain('Invalid status transition.');
    expect(emitted).toEqual([]);
  });

  it('locks every action once the incident is closed', () => {
    setup(IncidentStatus.Closed);
    expect(buttons()).toEqual([]);
  });
});
